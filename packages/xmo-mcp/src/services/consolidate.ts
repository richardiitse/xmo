import { tryAcquireLock, releaseLock, readLastConsolidatedAt } from './lock.js'
import { KG_DIR, readJSONL } from '@xmo/core'
import type { Entity } from '@xmo/core'

interface ConsolidateConfig {
  minHours: number
  minSessions: number
}

const DEFAULT_CONFIG: ConsolidateConfig = {
  minHours: 24,
  minSessions: 5,
}

export interface ConsolidateResult {
  success: boolean
  priorMtime: number | null
  sessionsReviewed: number
  entitiesProcessed: number
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
      error: `Time gate not passed: ${hoursSince.toFixed(1)}h since last consolidation (min: ${config.minHours}h)`,
    }
  }

  // Gate 3: Lock gate
  const priorMtime = await tryAcquireLock()
  if (priorMtime === null) {
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      error: 'Lock not acquired - consolidation already in progress',
    }
  }

  try {
    const entities = await readJSONL<Entity>(`${KG_DIR}/entities.jsonl`)
    const consolidated = await performConsolidation(entities)

    return {
      success: true,
      priorMtime,
      sessionsReviewed: 0,
      entitiesProcessed: consolidated.length,
    }
  } catch (error) {
    await releaseLock(priorMtime)
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function performConsolidation(entities: Entity[]): Promise<Entity[]> {
  const seen = new Map<string, Entity>()

  for (const entity of entities) {
    const key = `${entity.type}:${entity.properties.title}`

    if (seen.has(key)) {
      const existing = seen.get(key)!
      const mergedTags = [...new Set([...existing.tags, ...entity.tags])]
      seen.set(key, {
        ...existing,
        updatedAt: new Date().toISOString(),
        tags: mergedTags,
      })
    } else {
      seen.set(key, entity)
    }
  }

  return Array.from(seen.values())
}