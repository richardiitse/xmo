import { execFile } from 'child_process'
import { KG_FILE, readJSONL, sanitizeKeyword } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface QueryOptions {
  type?: string
  limit?: number
}

export interface QueryResult {
  entity: Entity
  matchedKeyword: string
}

/**
 * Search for entities in the KG using grep-based keyword search.
 *
 * NOTE: This is a breaking change from the prior embedding-based signature.
 * Old: queryEntities(query: string, options?)
 * New: queryEntities(keywords: string[], options?)
 * Callers that passed a single search string need updating (e.g. loadStage3
 * should split context into keywords first: context.split(/\s+/)).
 *
 * Keywords are batched (20 per batch) and deduplicated across batches.
 * Results are sorted by lastSeenAt desc and limited.
 */
export async function queryEntities(
  keywords: string[],
  options: QueryOptions = {}
): Promise<QueryResult[]> {
  if (keywords.length === 0) {
    return []
  }

  const limit = options.limit ?? 20

  // Sanitize and filter keywords
  const sanitized = keywords
    .map(k => sanitizeKeyword(k.trim()))
    .filter(k => k.length > 0)

  if (sanitized.length === 0) {
    return []
  }

  const BATCH_SIZE = 20
  const seen = new Map<string, QueryResult>()

  // Process in batches of BATCH_SIZE keywords per grep call
  for (let i = 0; i < sanitized.length; i += BATCH_SIZE) {
    const batch = sanitized.slice(i, i + BATCH_SIZE)

    // Build grep args: grep -i -e kw1 -e kw2 ... KG_FILE
    const grepArgs = ['-i', ...batch.flatMap(k => ['-e', k]), KG_FILE]

    let stdout: string
    try {
      const { stdout: out } = await execFileAsync('grep', grepArgs)
      stdout = out
    } catch (error: unknown) {
      // grep returns exit code 1 when no matches — not an error
      const err = error as { code?: number }
      if (err.code === 1) {
        continue
      }
      throw error
    }

    const matchedLines = stdout.split('\n').filter(line => line.trim())

    for (const line of matchedLines) {
      try {
        const entity = JSON.parse(line) as Entity
        if (options.type && entity.type !== options.type) continue
        if (!seen.has(entity.id)) {
          // When multiple keywords match, we pick the first one from the batch
          // that appears in the grep output for display purposes
          seen.set(entity.id, { entity, matchedKeyword: batch[0] })
        }
      } catch {
        // Skip malformed JSON lines (logged by readJSONL)
      }
    }
  }

  // Sort all results by lastSeenAt desc, then take top N
  const allResults = Array.from(seen.values())
  allResults.sort((a, b) => {
    const aTime = a.entity.lastSeenAt ?? a.entity.updatedAt
    const bTime = b.entity.lastSeenAt ?? b.entity.updatedAt
    return bTime.localeCompare(aTime)
  })

  return allResults.slice(0, limit)
}
