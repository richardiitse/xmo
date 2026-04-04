import { tryAcquireLock, releaseLock, readLastConsolidatedAt } from './lock.js'
import { KG_DIR, KG_FILE, readJSONL } from '../utils/fs.js'
import type { Entity } from '../types/index.js'
import { writeFile, rename } from 'fs/promises'
import { resolve } from 'path'

export interface ConsolidateConfig {
  minHours: number
  minSessions: number
  pruneAfterDays?: number
}

const DEFAULT_CONFIG: ConsolidateConfig = {
  minHours: 24,
  minSessions: 10,
  pruneAfterDays: 90,
}

export interface ConsolidateResult {
  success: boolean
  priorMtime: number | null
  sessionsReviewed: number
  entitiesProcessed: number
  entitiesPruned: number
  error?: string
}

export async function consolidate(config: ConsolidateConfig = DEFAULT_CONFIG): Promise<ConsolidateResult> {
  // Gate 1: Time gate
  const lastAt = await readLastConsolidatedAt()
  const hoursSince = (Date.now() - lastAt) / 3600000

  if (hoursSince < config.minHours) {
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      entitiesPruned: 0,
      error: `Time gate not passed: ${hoursSince.toFixed(1)}h since last consolidation (min: ${config.minHours}h)`,
    }
  }

  // Gate 2: Session count gate — TODO: track session IDs across consolidations
  // to actually enforce minSessions. Currently minSessions is accepted but not checked.
  // The session-count gate requires storing seen session IDs in the lock file or
  // a separate tracker, then comparing new session IDs against previously seen ones.

  // Gate 3: Lock gate
  const priorMtime = await tryAcquireLock()
  if (priorMtime === null) {
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      entitiesPruned: 0,
      error: 'Lock not acquired - consolidation already in progress',
    }
  }

  try {
    const entities = await readJSONL<Entity>(KG_FILE)
    const { consolidated, pruned } = await performConsolidation(entities, config.pruneAfterDays ?? 90)

    // Write consolidated entities back to KG (atomic write via temp file)
    const tmpFile = resolve(KG_DIR, 'entities.tmp.jsonl')
    const content = consolidated.map(e => JSON.stringify(e)).join('\n') + '\n'
    await writeFile(tmpFile, content)

    // Atomic rename (works on POSIX; approximates atomic overwrite)
    await rename(tmpFile, KG_FILE)

    return {
      success: true,
      priorMtime,
      sessionsReviewed: 0,
      entitiesProcessed: consolidated.length,
      entitiesPruned: pruned,
    }
  } catch (error) {
    await releaseLock(priorMtime)
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      entitiesPruned: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function performConsolidation(
  entities: Entity[],
  pruneAfterDays: number
): Promise<{ consolidated: Entity[]; pruned: number }> {
  const seen = new Map<string, Entity>()
  const pruneBefore = Date.now() - pruneAfterDays * 86400000

  for (const entity of entities) {
    // Prune stale entities (lastSeenAt older than prune threshold)
    const lastSeenTs = entity.lastSeenAt
      ? new Date(entity.lastSeenAt).getTime()
      : new Date(entity.updatedAt).getTime()
    if (lastSeenTs < pruneBefore) {
      continue // skip stale entity (will be pruned)
    }

    const name = (entity.properties.name as string | undefined) ?? (entity.properties.title as string | undefined) ?? ''
    const key = `${entity.type}:${name.toLowerCase()}`

    if (seen.has(key)) {
      const existing = seen.get(key)!
      const mergedTags = [...new Set([...existing.tags, ...entity.tags])]
      seen.set(key, {
        ...existing,
        updatedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        occurrences: (existing.occurrences ?? 1) + 1,
        tags: mergedTags,
      })
    } else {
      seen.set(key, {
        ...entity,
        lastSeenAt: entity.updatedAt,
        occurrences: 1,
      })
    }
  }

  const result = Array.from(seen.values())
  const pruned = entities.length - result.length
  return { consolidated: result, pruned }
}
