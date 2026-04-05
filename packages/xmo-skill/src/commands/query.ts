import { KG_FILE, sanitizeKeyword } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Query entities from KG using keyword search.
 * Returns Entity[] for programmatic use (e.g., in recover command).
 */
export async function queryEntities(
  keywords: string[],
  limit = 20
): Promise<Entity[]> {
  const sanitized = keywords
    .map(k => sanitizeKeyword(k.trim()))
    .filter(k => k.length > 0)

  if (sanitized.length === 0) {
    return []
  }

  const seen = new Map<string, Entity>()
  const BATCH_SIZE = 20

  // Process in batches
  for (let i = 0; i < sanitized.length; i += BATCH_SIZE) {
    const batch = sanitized.slice(i, i + BATCH_SIZE)
    const grepArgs = ['-i', ...batch.flatMap(k => ['-e', k]), KG_FILE]

    let stdout: string
    try {
      const { stdout: out } = await execFileAsync('grep', grepArgs)
      stdout = out
    } catch (error: unknown) {
      const err = error as { code?: number }
      if (err.code === 1) continue // no matches
      throw error
    }

    const lines = stdout.split('\n').filter(l => l.trim())
    for (const line of lines) {
      try {
        const entity = JSON.parse(line) as Entity
        if (!seen.has(entity.id)) {
          seen.set(entity.id, entity)
        }
      } catch {
        // skip malformed
      }
    }
  }

  if (seen.size === 0) {
    return []
  }

  const results = Array.from(seen.values())
  results.sort((a, b) => {
    const aTime = a.lastSeenAt ?? a.updatedAt
    const bTime = b.lastSeenAt ?? b.updatedAt
    return bTime.localeCompare(aTime)
  })

  return results.slice(0, limit)
}

/**
 * /xmo-query command
 * Searches the KG using grep-based keyword search (batched for performance).
 */
export async function runQuery(keywords: string[], limit = 20): Promise<string> {
  if (keywords.length === 0) {
    return 'Usage: /xmo-query <keyword> [<keyword>...]'
  }

  const entities = await queryEntities(keywords, limit)

  if (entities.length === 0) {
    return `No results for: ${keywords.join(', ')}`
  }

  const lines = entities.map(entity => {
    const name =
      (entity.properties.name as string | undefined) ??
      (entity.properties.title as string | undefined) ??
      '(unnamed)'
    const content = (entity.properties.content as string | undefined) ?? ''
    return `[${entity.type}] ${name}${content ? '\n  ' + content.slice(0, 100) : ''}`
  })

  return `Found ${entities.length} result(s):\n\n${lines.join('\n\n')}`
}
