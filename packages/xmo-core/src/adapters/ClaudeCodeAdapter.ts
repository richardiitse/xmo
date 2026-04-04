import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { stat } from 'fs/promises'
import { resolve, dirname } from 'path'
import type { ToolAdapter, SessionTranscript, Message } from './ToolAdapter.js'

/**
 * Claude Code session transcript adapter.
 *
 * Claude Code stores transcripts at:
 *   ~/.claude/sessions/<session-id>/transcript.json
 */
export const claudeCodeAdapter: ToolAdapter = {
  name: 'claude-code',

  sessionGlobs: [
    resolve(process.env.HOME!, '.claude/sessions/*/transcript.json'),
  ],

  async parseSession(filePath: string): Promise<SessionTranscript> {
    const content = await readFile(filePath, 'utf-8')
    const data = JSON.parse(content) as {
      sessionId?: string
      messages?: Array<{
        role?: string
        type?: string
        content?: string
        timestamp?: string
        speaker?: string
      }>
      startedAt?: string
      endedAt?: string
    }

    const messages: Message[] = (data.messages ?? []).map(msg => ({
      role: (msg.role ?? msg.speaker ?? 'unknown') as Message['role'],
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      timestamp: msg.timestamp,
    }))

    return {
      sessionId: data.sessionId ?? (() => {
        const match = filePath.match(/\.claude\/sessions\/([^/]+)/)
        return match ? match[1] : 'unknown'
      })(),
      messages,
      startedAt: data.startedAt ?? new Date(0).toISOString(),
      endedAt: data.endedAt,
    }
  },

  async getLastModified(sessionDir: string): Promise<Date> {
    const st = await stat(sessionDir)
    return st.mtime
  },

  /**
   * Find all Claude Code session transcript paths.
   */
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
