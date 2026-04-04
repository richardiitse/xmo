import { claudeCodeAdapter, openClawAdapter, extractFromTranscript } from '../adapters/index.js'
import { KG_FILE, appendJSONL, ensureXmoDir } from '../utils/fs.js'
import { generateEntityId } from '../utils/uuid.js'
import type { Entity, EntityType } from '../types/index.js'
import type { ToolAdapter } from '../adapters/ToolAdapter.js'

const ALL_ADAPTERS: ToolAdapter[] = [claudeCodeAdapter, openClawAdapter]

export interface SessionExtractionResult {
  success: boolean
  sessionsFound: number
  entitiesExtracted: number
  errors: string[]
}

/**
 * Extract entities from all sessions across all configured adapters.
 * Returns summary of extraction results.
 */
export async function extractFromAllSessions(): Promise<SessionExtractionResult> {
  await ensureXmoDir()

  const result: SessionExtractionResult = {
    success: true,
    sessionsFound: 0,
    entitiesExtracted: 0,
    errors: [],
  }

  for (const adapter of ALL_ADAPTERS) {
    try {
      const findSessions = adapter.findSessions?.bind(adapter) ?? (async () => [])
      const sessions = await findSessions()
      for (const sessionPath of sessions) {
        try {
          const transcript = await adapter.parseSession(sessionPath)
          const extracted = extractFromTranscript(transcript)

          for (const item of extracted) {
            const entity: Entity = {
              id: generateEntityId(item.type),
              type: mapToEntityType(item.type),
              extractedAt: new Date().toISOString(),
              lastSeenAt: new Date().toISOString(),
              occurrences: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              tags: [`source:${adapter.name}`, `confidence:${item.confidence}`],
              properties: {
                name: item.name,
                content: item.name,
                source: 'extract' as const,
                sessionSource: adapter.name,
                sessionId: transcript.sessionId,
                matchedPatterns: item.matchedPatterns,
              },
            }

            await appendJSONL(KG_FILE, entity)
            result.entitiesExtracted++
          }

          result.sessionsFound++
        } catch (err) {
          result.errors.push(`Failed to process session ${sessionPath}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } catch (err) {
      result.errors.push(`Failed to find sessions for adapter ${adapter.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (result.errors.length > 0 && result.entitiesExtracted === 0) {
    result.success = false
  }

  return result
}

/**
 * Extract entities from sessions for a specific adapter only.
 */
export async function extractFromSessions(adapterName: 'claude-code' | 'openclaw'): Promise<SessionExtractionResult> {
  await ensureXmoDir()

  const adapter = ALL_ADAPTERS.find(a => a.name === adapterName)
  if (!adapter) {
    return {
      success: false,
      sessionsFound: 0,
      entitiesExtracted: 0,
      errors: [`Unknown adapter: ${adapterName}`],
    }
  }

  const result: SessionExtractionResult = {
    success: true,
    sessionsFound: 0,
    entitiesExtracted: 0,
    errors: [],
  }

  try {
    const findSessions = adapter.findSessions?.bind(adapter) ?? (async () => [])
    const sessions = await findSessions()
    for (const sessionPath of sessions) {
      try {
        const transcript = await adapter.parseSession(sessionPath)
        const extracted = extractFromTranscript(transcript)

        for (const item of extracted) {
          const entity: Entity = {
            id: generateEntityId(item.type),
            type: mapToEntityType(item.type),
            extractedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            occurrences: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [`source:${adapter.name}`, `confidence:${item.confidence}`],
            properties: {
              name: item.name,
              content: item.name,
              source: 'extract' as const,
              sessionSource: adapter.name,
              sessionId: transcript.sessionId,
              matchedPatterns: item.matchedPatterns,
            },
          }

          await appendJSONL(KG_FILE, entity)
          result.entitiesExtracted++
        }

        result.sessionsFound++
      } catch (err) {
        result.errors.push(`Failed to process session ${sessionPath}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  } catch (err) {
    result.success = false
    result.errors.push(`Failed to find sessions: ${err instanceof Error ? err.message : String(err)}`)
  }

  return result
}

/**
 * Map extracted type to Entity type.
 */
function mapToEntityType(type: 'url' | 'person' | 'decision' | 'concept' | 'tool'): EntityType {
  switch (type) {
    case 'url':
      return 'url'
    case 'person':
      return 'person'
    case 'decision':
      return 'Decision'
    case 'concept':
      return 'concept'
    case 'tool':
      return 'concept'
    default:
      return 'concept'
  }
}
