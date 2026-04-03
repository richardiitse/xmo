import { claudeCodeAdapter, extractFromTranscript } from '@xmo/core'
import { KG_FILE, appendJSONL, generateEntityId } from '@xmo/core'
import type { ToolAdapter } from '@xmo/core'

/**
 * /xmo-extract command
 * Parses the most recent Claude Code session transcript and extracts entities.
 */
export async function runExtract(): Promise<string> {
  const adapter = claudeCodeAdapter

  // Find most recent session
  const findSessions = adapter.findSessions ?? (async () => {
    const { glob } = await import('glob')
    const paths: string[] = []
    for (const pattern of adapter.sessionGlobs) {
      const matches = await glob(pattern)
      paths.push(...matches)
    }
    return paths
  })
  const sessions = await findSessions()
  if (sessions.length === 0) {
    return 'No Claude Code sessions found.'
  }

  // Sort by mtime, most recent first
  const withMtime = await Promise.all(
    sessions.map(async (filePath: string) => {
      const dir = filePath.replace('/transcript.json', '')
      const mtime = await adapter.getLastModified(dir)
      return { filePath, mtime }
    })
  )
  withMtime.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  const latestSession = withMtime[0].filePath
  const transcript = await adapter.parseSession(latestSession)

  if (transcript.messages.length === 0) {
    return 'Session has no messages.'
  }

  // Extract entities using pattern-based extraction
  const extracted = extractFromTranscript(transcript)

  if (extracted.length === 0) {
    return 'No entities extracted from session.'
  }

  // Write entities to KG
  const now = new Date().toISOString()
  let count = 0
  for (const e of extracted) {
    const entity = {
      id: generateEntityId(e.type),
      type: e.type,
      sessionId: transcript.sessionId,
      extractedAt: now,
      lastSeenAt: now,
      occurrences: 1,
      createdAt: now,
      updatedAt: now,
      tags: [e.type, e.confidence],
      properties: {
        name: e.name,
        content: `Extracted via pattern matching (confidence: ${e.confidence})`,
        source: 'extract' as const,
        confidence: e.confidence,
        matchedPatterns: e.matchedPatterns,
      },
    }
    await appendJSONL(KG_FILE, entity)
    count++
  }

  return `Extracted ${count} entity(s) from session ${transcript.sessionId.slice(0, 8)}...`
}
