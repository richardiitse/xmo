import { KG_FILE, readJSONL, sanitizeKeyword } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * /xmo-query command
 * Searches the KG using grep-based keyword search (batched for performance).
 */
export async function runQuery(keywords: string[], limit = 20): Promise<string> {
  if (keywords.length === 0) {
    return 'Usage: /xmo-query <keyword> [<keyword>...]'
  }

  try {
    const sanitized = keywords
      .map(k => sanitizeKeyword(k.trim()))
      .filter(k => k.length > 0)

    if (sanitized.length === 0) {
      return `No results for: ${keywords.join(', ')}`
    }

    const seen = new Map<string, { entity: Entity; matchedKeyword: string }>()
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
            seen.set(entity.id, { entity, matchedKeyword: batch[0] })
          }
        } catch {
          // skip malformed
        }
      }
    }

    if (seen.size === 0) {
      return `No results for: ${keywords.join(', ')}`
    }

    const results = Array.from(seen.values())
    results.sort((a, b) => {
      const aTime = a.entity.lastSeenAt ?? a.entity.updatedAt
      const bTime = b.entity.lastSeenAt ?? b.entity.updatedAt
      return bTime.localeCompare(aTime)
    })

    const top = results.slice(0, limit)
    const lines = top.map(r => {
      const name = (r.entity.properties.name as string | undefined) ?? (r.entity.properties.title as string | undefined) ?? '(unnamed)'
      const content = (r.entity.properties.content as string | undefined) ?? ''
      return `[${r.entity.type}] ${name}\n  matched: "${r.matchedKeyword}"${content ? '\n  ' + content.slice(0, 100) : ''}`
    })

    return `Found ${top.length} result(s):\n\n${lines.join('\n\n')}`
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return `Query failed: ${msg}`
  }
}
