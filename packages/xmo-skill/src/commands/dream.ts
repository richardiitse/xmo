import { KG_FILE, readJSONL, consolidate } from '@xmo/core'
import type { Entity } from '@xmo/core'

/**
 * /xmo-dream command
 * Forces consolidation by bypassing the time gate (minHours=0).
 * Lock gate and session count still apply.
 */
export async function runDream(): Promise<string> {
  const result = await consolidate({ minHours: 0, minSessions: 0 })

  if (result.success) {
    return [
      `Dream consolidation complete.`,
      `Entities processed: ${result.entitiesProcessed}`,
      `Entities pruned: ${result.entitiesPruned}`,
    ].join('\n')
  }

  return `Dream consolidation skipped: ${result.error}`
}

/**
 * /xmo-stats command
 * Shows KG statistics.
 */
export async function runStats(): Promise<string> {
  try {
    const entities = await readJSONL<Entity>(KG_FILE)

    if (entities.length === 0) {
      return 'XMO Knowledge Graph is empty.\nRun /xmo-extract to populate it.'
    }

    const byType = new Map<string, number>()
    let totalOccurrences = 0
    let oldest = new Date(0)
    let newest = new Date(0)

    for (const e of entities) {
      byType.set(e.type, (byType.get(e.type) ?? 0) + 1)
      totalOccurrences += e.occurrences ?? 1
      const updated = new Date(e.updatedAt)
      if (updated > newest) newest = updated
      if (updated < oldest) oldest = updated
    }

    const typeLines = Array.from(byType.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `  ${type}: ${count}`)
      .join('\n')

    return [
      `XMO Knowledge Graph Stats`,
      `=========================`,
      `Total entities: ${entities.length}`,
      `Total occurrences: ${totalOccurrences}`,
      ``,
      `By type:`,
      typeLines,
      ``,
      `Oldest entry: ${oldest.toISOString().slice(0, 10)}`,
      `Newest entry: ${newest.toISOString().slice(0, 10)}`,
    ].join('\n')
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return `Stats failed: ${msg}`
  }
}
