import {
  allAdapters,
  appendJSONL,
  ensureXmoDir,
  extractFromTranscript,
  generateEntityId,
  getAdapterByName,
  isAdapterName,
  KG_FILE,
} from '@xmo/core'
import type { AdapterName, EntityType, ToolAdapter } from '@xmo/core'

export interface ExtractOptions {
  adapter?: AdapterName | 'auto'
}

/**
 * /xmo-extract command
 * Parses the most recent supported session transcript and extracts entities.
 */
export async function runExtract(options: ExtractOptions = {}): Promise<string> {
  const scope = resolveAdapters(options.adapter)
  const latest = await findLatestSession(scope)

  if (!latest) {
    const label = options.adapter && options.adapter !== 'auto'
      ? options.adapter
      : 'supported'
    return `No ${label} sessions found.`
  }

  const { adapter, filePath } = latest
  const transcript = await adapter.parseSession(filePath)

  if (transcript.messages.length === 0) {
    return 'Session has no messages.'
  }

  // Extract entities using pattern-based extraction
  const extracted = extractFromTranscript(transcript)

  if (extracted.length === 0) {
    return 'No entities extracted from session.'
  }

  // Write entities to KG
  await ensureXmoDir()
  const now = new Date().toISOString()
  let count = 0
  for (const e of extracted) {
    const entity = {
      id: generateEntityId(e.type),
      type: mapExtractedTypeToEntityType(e.type),
      sessionId: transcript.sessionId,
      extractedAt: now,
      lastSeenAt: now,
      occurrences: 1,
      createdAt: now,
      updatedAt: now,
      tags: [e.type, e.confidence, `source:${adapter.name}`],
      properties: {
        name: e.name,
        content: `Extracted from ${adapter.name} via pattern matching (confidence: ${e.confidence})`,
        source: 'extract' as const,
        confidence: e.confidence,
        matchedPatterns: e.matchedPatterns,
        sessionSource: adapter.name,
      },
    }
    await appendJSONL(KG_FILE, entity)
    count++
  }

  return `Extracted ${count} entity(s) from ${adapter.name} session ${transcript.sessionId.slice(0, 8)}...`
}

function resolveAdapters(adapterName: ExtractOptions['adapter']): ToolAdapter[] {
  if (!adapterName || adapterName === 'auto') {
    return allAdapters
  }

  if (!isAdapterName(adapterName)) {
    return allAdapters
  }

  const adapter = getAdapterByName(adapterName)
  return adapter ? [adapter] : allAdapters
}

async function findLatestSession(adapters: ToolAdapter[]): Promise<{ adapter: ToolAdapter; filePath: string; mtime: Date } | null> {
  let latest: { adapter: ToolAdapter; filePath: string; mtime: Date } | null = null

  for (const adapter of adapters) {
    const sessions = adapter.findSessions
      ? await adapter.findSessions()
      : []

    const withMtime = await Promise.all(
      sessions.map(async filePath => ({
        adapter,
        filePath,
        mtime: await adapter.getLastModified(filePath),
      }))
    )

    for (const entry of withMtime) {
      if (!latest || entry.mtime.getTime() > latest.mtime.getTime()) {
        latest = entry
      }
    }
  }

  return latest
}

function mapExtractedTypeToEntityType(type: 'url' | 'person' | 'decision' | 'concept' | 'tool'): EntityType {
  switch (type) {
    case 'decision':
      return 'Decision'
    case 'tool':
      return 'tool'
    case 'url':
      return 'url'
    case 'person':
      return 'person'
    case 'concept':
    default:
      return 'concept'
  }
}
