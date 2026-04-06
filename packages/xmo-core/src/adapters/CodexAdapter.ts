import { readFile, stat } from 'fs/promises'
import { glob } from 'glob'
import { basename, resolve } from 'path'
import type { Message, SessionTranscript, ToolAdapter } from './ToolAdapter.js'

interface CodexSessionEntry {
  timestamp?: string
  type?: string
  payload?: {
    id?: string
    timestamp?: string
    type?: string
    role?: string
    name?: string
    arguments?: unknown
    output?: unknown
    content?: Array<{
      type?: string
      text?: string
    }>
  }
}

/**
 * Codex session transcript adapter.
 *
 * Codex stores rollouts at:
 *   ~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<session-id>.jsonl
 */
export const codexAdapter: ToolAdapter = {
  name: 'codex',

  sessionGlobs: [
    resolve(process.env.HOME ?? '', '.codex/sessions/**/*.jsonl'),
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
        const entry = JSON.parse(line) as CodexSessionEntry

        if (entry.type === 'session_meta') {
          sessionIdFromJson = entry.payload?.id ?? sessionIdFromJson
          startedAt = entry.payload?.timestamp ?? entry.timestamp ?? startedAt
          continue
        }

        if (entry.type !== 'response_item' || !entry.payload) {
          continue
        }

        const payload = entry.payload
        const timestamp = entry.timestamp ?? payload.timestamp

        if (payload.type === 'message') {
          const role = normalizeCodexRole(payload.role)
          if (!role) {
            continue
          }

          const text = (payload.content ?? [])
            .map(block => block.text ?? '')
            .filter(Boolean)
            .join('\n')
            .trim()

          if (text) {
            messages.push({ role, content: text, timestamp })
            endedAt = timestamp ?? endedAt
          }
          continue
        }

        if (payload.type === 'function_call' || payload.type === 'custom_tool_call') {
          const toolName = payload.name
          if (typeof toolName === 'string') {
            messages.push({
              role: 'assistant',
              content: `[tool:${toolName}] ${stringifyPayload(payload.arguments)}`,
              timestamp,
            })
            endedAt = timestamp ?? endedAt
          }
          continue
        }

        if (payload.type === 'function_call_output' || payload.type === 'custom_tool_call_output') {
          const output = stringifyPayload(payload.output)
          if (output) {
            messages.push({
              role: 'tool',
              content: output,
              timestamp,
            })
            endedAt = timestamp ?? endedAt
          }
        }
      } catch {
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

  async getLastModified(sessionPath: string): Promise<Date> {
    const st = await stat(sessionPath)
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

function normalizeCodexRole(role?: string): Message['role'] | null {
  switch (role) {
    case 'user':
      return 'user'
    case 'assistant':
      return 'assistant'
    case 'tool':
      return 'tool'
    case 'system':
    case 'developer':
      return 'system'
    default:
      return null
  }
}

function stringifyPayload(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value == null) {
    return ''
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function extractSessionId(filePath: string): string {
  const match = filePath.match(/rollout-[^-]+-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-(.+)\.jsonl$/)
  if (match) {
    return match[1]
  }

  return basename(filePath, '.jsonl') || 'unknown'
}
