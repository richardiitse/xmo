import { describe, it, expect } from 'vitest'
import type { Entity, EntityType } from '../types/index.js'

// Test the performConsolidation logic in isolation
// We test the deduplication and pruning logic directly

describe('consolidate logic', () => {
  function performConsolidation(
    entities: Entity[],
    pruneAfterDays: number
  ): { consolidated: Entity[]; pruned: number } {
    const seen = new Map<string, Entity>()
    const pruneBefore = Date.now() - pruneAfterDays * 86400000

    for (const entity of entities) {
      const lastSeen = new Date(entity.updatedAt).getTime()
      if (lastSeen < pruneBefore) {
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

  function makeEntity(id: string, type: EntityType, name: string, updatedAt: Date, tags: string[] = []): Entity {
    return {
      id,
      type,
      createdAt: updatedAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      tags,
      properties: { name },
    }
  }

  it('deduplicates entities with same type and name', () => {
    const now = new Date()
    const entities = [
      makeEntity('1', 'Decision', 'use vitest', now, ['tag1']),
      makeEntity('2', 'Decision', 'use vitest', now, ['tag2']),
    ]

    const { consolidated, pruned } = performConsolidation(entities, 90)

    expect(consolidated).toHaveLength(1)
    expect(consolidated[0].occurrences).toBe(2)
    expect(consolidated[0].tags).toContain('tag1')
    expect(consolidated[0].tags).toContain('tag2')
    expect(pruned).toBe(1)
  })

  it('keeps entities with different types separate', () => {
    const now = new Date()
    const entities = [
      makeEntity('1', 'Decision', 'use vitest', now),
      makeEntity('2', 'Finding', 'use vitest', now),
    ]

    const { consolidated, pruned } = performConsolidation(entities, 90)

    expect(consolidated).toHaveLength(2)
    expect(pruned).toBe(0)
  })

  it('keeps entities with different names separate', () => {
    const now = new Date()
    const entities = [
      makeEntity('1', 'Decision', 'use vitest', now),
      makeEntity('2', 'Decision', 'use jest', now),
    ]

    const { consolidated, pruned } = performConsolidation(entities, 90)

    expect(consolidated).toHaveLength(2)
    expect(pruned).toBe(0)
  })

  it('prunes entities older than prune threshold', () => {
    const now = new Date()
    const oldDate = new Date(Date.now() - 100 * 86400000) // 100 days ago
    const entities = [
      makeEntity('1', 'Decision', 'recent decision', now),
      makeEntity('2', 'Decision', 'old decision', oldDate),
    ]

    const { consolidated, pruned } = performConsolidation(entities, 90)

    expect(consolidated).toHaveLength(1)
    expect(consolidated[0].properties.name).toBe('recent decision')
    expect(pruned).toBe(1)
  })

  it('merges tags from duplicate entities', () => {
    const now = new Date()
    const entities = [
      makeEntity('1', 'Finding', 'security bug', now, ['security', 'high']),
      makeEntity('2', 'Finding', 'security bug', now, ['security', 'critical']),
    ]

    const { consolidated } = performConsolidation(entities, 90)

    expect(consolidated[0].tags).toContain('security')
    expect(consolidated[0].tags).toContain('high')
    expect(consolidated[0].tags).toContain('critical')
  })

  it('handles empty entity list', () => {
    const { consolidated, pruned } = performConsolidation([], 90)
    expect(consolidated).toHaveLength(0)
    expect(pruned).toBe(0)
  })
})
