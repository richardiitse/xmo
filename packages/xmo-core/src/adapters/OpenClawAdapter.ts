import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { stat } from 'fs/promises'
import { resolve } from 'path'
import type { ToolAdapter, SessionTranscript, Message } from './ToolAdapter.js'

/**
 * OpenClaw session transcript adapter.
 *
 * OpenClaw stores session transcripts at:
 *   ~/.openclaw/agents/<agent>/sessions/<session-id>.jsonl
 *
 * JSONL format: one JSON object per line
 * Entry types: session, message, model_change, thinking_level_change, custom
 */
export const openClawAdapter: ToolAdapter = {
  name: 'openclaw',

  sessionGlobs: [
    resolve(process.env.HOME ?? '', '.openclaw/agents/*/sessions/*.jsonl'),
  ],

  async parseSession(filePath: string): Promise<SessionTranscript> {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    const messages: Message[] = []
    let startedAt = new Date(0).toISOString()
    let endedAt: string | undefined
    let sessionIdFromJson: string | undefined

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as {
          type?: string
          id?: string
          timestamp?: string
          message?: {
            role?: string
            content?: Array<{
              type?: string
              text?: string
              toolName?: string
              name?: string
              arguments?: unknown
              content?: Array<{ text?: string }>
              thinking?: string
            }>
            timestamp?: number
          }
        }

        if (entry.type === 'session') {
          startedAt = entry.timestamp ?? startedAt
          sessionIdFromJson = entry.id
        }

        if (entry.type === 'message' && entry.message) {
          const msg = entry.message
          const msgTimestamp = msg.timestamp
            ? new Date(msg.timestamp).toISOString()
            : entry.timestamp ?? undefined

          // Extract content from content blocks
          const contentBlocks = msg.content ?? []
          for (const block of contentBlocks) {
            if (block.type === 'text' && block.text) {
              messages.push({
                role: (msg.role ?? 'unknown') as Message['role'],
                content: block.text,
                timestamp: msgTimestamp,
              })
            } else if (block.type === 'toolCall' && block.name) {
              messages.push({
                role: 'assistant',
                content: `[tool:${block.name}] ${JSON.stringify(block.arguments ?? {})}`,
                timestamp: msgTimestamp,
              })
            } else if (block.type === 'toolResult' && block.content) {
              const resultText = block.content
                .map(c => c.text ?? '')
                .join('\n')
              messages.push({
                role: 'tool',
                content: resultText,
                timestamp: msgTimestamp,
              })
            } else if (block.type === 'thinking' && block.thinking) {
              messages.push({
                role: 'assistant',
                content: `[thinking] ${block.thinking}`,
                timestamp: msgTimestamp,
              })
            }
          }

          // Update endedAt to last message timestamp
          if (msgTimestamp) {
            endedAt = msgTimestamp
          }
        }
      } catch {
        // Skip malformed JSON lines
        continue
      }
    }

    return {
      sessionId: sessionIdFromJson ?? extractSessionId(filePath),
      messages,
      startedAt,
      endedAt,
    }
  },

  async getLastModified(sessionDir: string): Promise<Date> {
    const st = await stat(sessionDir)
    return st.mtime
  },

  async findSessions(): Promise<string[]> {
    const paths: string[] = []
    for (const pattern of this.sessionGlobs) {
      const matches = await glob(pattern)
      paths.push(...matches)
    }
    return paths
  },
}

/**
 * Extract session ID from file path.
 * Format: ~/.openclaw/agents/<agent>/sessions/<session-id>.jsonl
 * Falls back to filename without extension for non-standard paths.
 */
function extractSessionId(filePath: string): string {
  // Try standard OpenClaw path pattern first
  const match = filePath.match(/\.openclaw\/agents\/[^/]+\/sessions\/([^/]+)/)
  if (match) {
    return match[1]
  }
  // Fallback: extract filename without extension
  const fileName = filePath.split('/').pop() ?? ''
  return fileName.replace(/\.[^.]+$/, '') || 'unknown'
}
