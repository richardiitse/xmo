import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { stat } from 'fs/promises'
import { resolve, basename } from 'path'
import type { ToolAdapter, SessionTranscript, Message } from './ToolAdapter.js'

/**
 * Claude Code session transcript adapter.
 *
 * Claude Code stores transcripts at:
 *   ~/.claude/projects/<encoded-project-path>/<session-uuid>.jsonl
 *
 * Each line is a JSON entry with types: user, assistant, system,
 * file-history-snapshot, last-prompt, etc.
 * message.content can be a string or array of content blocks.
 */
export const claudeCodeAdapter: ToolAdapter = {
  name: 'claude-code',

  sessionGlobs: [
    resolve(process.env.HOME ?? '', '.claude/projects/**/*.jsonl'),
  ],

  async parseSession(filePath: string): Promise<SessionTranscript> {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    const messages: Message[] = []
    let sessionId = 'unknown'
    let startedAt = new Date(0).toISOString()
    let endedAt: string | undefined

    for (const line of lines) {
      let entry: Record<string, unknown>
      try {
        entry = JSON.parse(line) as Record<string, unknown>
      } catch {
        continue
      }

      const type = entry.type as string | undefined

      // Extract session ID from any entry that has it
      if (typeof entry.sessionId === 'string' && sessionId === 'unknown') {
        sessionId = entry.sessionId
      }

      // Only process user and assistant entries
      if (type !== 'user' && type !== 'assistant') continue

      const msg = entry.message as Record<string, unknown> | undefined
      if (!msg) continue

      const role = msg.role as string | undefined
      if (role !== 'user' && role !== 'assistant') continue

      const text = extractText(msg.content)
      if (!text) continue

      const timestamp = (entry.timestamp ?? msg.timestamp) as string | undefined
      if (timestamp && startedAt === new Date(0).toISOString()) {
        startedAt = timestamp
      }
      if (timestamp) {
        endedAt = timestamp
      }

      messages.push({
        role: role as Message['role'],
        content: text,
        timestamp,
      })
    }

    // Derive sessionId from filename if not found in entries
    if (sessionId === 'unknown') {
      const name = basename(filePath, '.jsonl')
      sessionId = name
    }

    return { sessionId, messages, startedAt, endedAt }
  },

  async getLastModified(filePath: string): Promise<Date> {
    const st = await stat(filePath)
    return st.mtime
  },

  // Find all Claude Code session transcript paths.
  // Excludes subagent transcripts (under subagents/ directories).
  async findSessions(): Promise<string[]> {
    const paths: string[] = []
    for (const pattern of this.sessionGlobs) {
      const matches = await glob(pattern)
      // Exclude subagent transcripts — subagent sessions live under a /subagents/ directory segment
      const filtered = matches.filter(p => !/\/subagents\//.test(p))
      paths.push(...filtered)
    }
    return paths
  },
}

/**
 * Extract text from message content which can be:
 * - a string
 * - an array of content blocks [{type: "text", text: "..."}, {type: "thinking"}, ...]
 */
function extractText(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .filter((block): block is Record<string, unknown> =>
        typeof block === 'object' && block !== null && (block as Record<string, unknown>).type === 'text'
      )
      .map(block => block.text as string)
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

/**
 * Pattern-based entity extraction from a transcript.
 * Returns ExtractedEntity[] with confidence scoring.
 */
export function extractFromTranscript(
  transcript: SessionTranscript
): Array<{
  type: 'url' | 'person' | 'decision' | 'concept' | 'tool'
  name: string
  confidence: 'high' | 'medium' | 'low'
  matchedPatterns: string[]
}> {
  const results: Array<{
    type: 'url' | 'person' | 'decision' | 'concept' | 'tool'
    name: string
    matchedPatterns: string[]
  }> = []

  const urlPattern = /https?:\/\/[^\s]+/g
  const personPattern = /@[a-zA-Z0-9_-]+/g
  const boldPattern = /\*\*[^*]+\*\*/g
  const underlinePattern = /__[^_]+__/g
  const toolPattern = /\/[a-zA-Z][a-zA-Z0-9-]*/g

  const text = transcript.messages.map(m => m.content).join('\n')

  // Extract URLs
  let match: RegExpExecArray | null
  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[0]
    if (!url.startsWith('!')) {
      results.push({ type: 'url', name: url, matchedPatterns: ['url'] })
    }
  }

  // Extract person mentions
  while ((match = personPattern.exec(text)) !== null) {
    results.push({ type: 'person', name: match[0], matchedPatterns: ['person'] })
  }

  // Extract decisions (bold or underline emphasis)
  while ((match = boldPattern.exec(text)) !== null) {
    const name = match[0].replace(/\*\*/g, '')
    results.push({ type: 'decision', name, matchedPatterns: ['bold'] })
  }
  while ((match = underlinePattern.exec(text)) !== null) {
    const name = match[0].replace(/__/g, '')
    results.push({ type: 'decision', name, matchedPatterns: ['underline'] })
  }

  // Extract tool invocations
  while ((match = toolPattern.exec(text)) !== null) {
    results.push({ type: 'tool', name: match[0], matchedPatterns: ['tool'] })
  }

  // Extract concepts: capitalized phrase at start of line (after blank line)
  const conceptPattern = /(?:^|\n\n)([A-Z][A-Za-z0-9 ]+(?:\s+[A-Z][A-Za-z0-9]+)*)/gm
  while ((match = conceptPattern.exec(text)) !== null) {
    const phrase = match[1].trim()
    if (phrase.length > 2 && phrase.length < 80) {
      results.push({ type: 'concept', name: phrase, matchedPatterns: ['capitalized'] })
    }
  }

  // Deduplicate by name (case-insensitive)
  const seen = new Map<string, typeof results[0]>()
  for (const r of results) {
    const key = `${r.type}:${r.name.toLowerCase()}`
    if (seen.has(key)) {
      seen.get(key)!.matchedPatterns.push(...r.matchedPatterns)
    } else {
      seen.set(key, { ...r, matchedPatterns: [...r.matchedPatterns] })
    }
  }

  // Confidence scoring
  return Array.from(seen.values()).map(r => ({
    ...r,
    matchedPatterns: [...new Set(r.matchedPatterns)],
    confidence:
      r.matchedPatterns.length >= 3
        ? 'high'
        : r.matchedPatterns.length === 2
          ? 'medium'
          : 'low',
  }))
}
