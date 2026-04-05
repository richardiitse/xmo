import { describe, it, expect } from 'vitest'
import { createKGStore, addEntity, getEntitiesByType, getEntitiesByTag } from './entity.js'
import type { Entity } from '../types/index.js'

function createTestEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: overrides.id ?? 'test-id',
    type: overrides.type ?? 'concept',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: overrides.tags ?? ['test'],
    properties: { name: overrides.properties?.name ?? 'Test Entity' },
    ...overrides,
  }
}

describe('entity schema', () => {
  describe('createKGStore', () => {
    it('creates empty store with all maps initialized', () => {
      const store = createKGStore()
      expect(store.entities).toBeInstanceOf(Map)
      expect(store.relations).toBeInstanceOf(Map)
      expect(store.indexByType).toBeInstanceOf(Map)
      expect(store.indexByTag).toBeInstanceOf(Map)
      expect(store.entities.size).toBe(0)
    })
  })

  describe('addEntity', () => {
    it('adds entity to entities map', () => {
      const store = createKGStore()
      const entity = createTestEntity({ id: 'entity-1' })
      addEntity(store, entity)
      expect(store.entities.get('entity-1')).toEqual(entity)
    })

    it('indexes entity by type', () => {
      const store = createKGStore()
      const entity = createTestEntity({ id: 'entity-1', type: 'Decision' })
      addEntity(store, entity)
      const result = getEntitiesByType(store, 'Decision')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('entity-1')
    })

    it('indexes entity by tags', () => {
      const store = createKGStore()
      const entity = createTestEntity({ id: 'entity-1', tags: ['tag1', 'tag2'] })
      addEntity(store, entity)
      const result = getEntitiesByTag(store, 'tag1')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('entity-1')
    })

    it('handles multiple entities with same type', () => {
      const store = createKGStore()
      addEntity(store, createTestEntity({ id: 'e1', type: 'Decision' }))
      addEntity(store, createTestEntity({ id: 'e2', type: 'Decision' }))
      addEntity(store, createTestEntity({ id: 'e3', type: 'concept' }))
      const result = getEntitiesByType(store, 'Decision')
      expect(result).toHaveLength(2)
    })

    it('handles multiple entities with same tag', () => {
      const store = createKGStore()
      addEntity(store, createTestEntity({ id: 'e1', tags: ['shared'] }))
      addEntity(store, createTestEntity({ id: 'e2', tags: ['shared', 'other'] }))
      const result = getEntitiesByTag(store, 'shared')
      expect(result).toHaveLength(2)
    })

    it('adds to existing type index', () => {
      const store = createKGStore()
      addEntity(store, createTestEntity({ id: 'e1', type: 'Decision' }))
      addEntity(store, createTestEntity({ id: 'e2', type: 'Decision' }))
      expect(store.indexByType.get('Decision')).toBeInstanceOf(Set)
      expect(store.indexByType.get('Decision')!.size).toBe(2)
    })

    it('adds to existing tag index', () => {
      const store = createKGStore()
      addEntity(store, createTestEntity({ id: 'e1', tags: ['tag'] }))
      addEntity(store, createTestEntity({ id: 'e2', tags: ['tag'] }))
      expect(store.indexByTag.get('tag')).toBeInstanceOf(Set)
      expect(store.indexByTag.get('tag')!.size).toBe(2)
    })
  })

  describe('getEntitiesByType', () => {
    it('returns empty array for non-existent type', () => {
      const store = createKGStore()
      const result = getEntitiesByType(store, 'Decision')
      expect(result).toEqual([])
    })

    it('returns all entities of given type', () => {
      const store = createKGStore()
      addEntity(store, createTestEntity({ id: 'e1', type: 'Decision' }))
      addEntity(store, createTestEntity({ id: 'e2', type: 'concept' }))
      addEntity(store, createTestEntity({ id: 'e3', type: 'Decision' }))
      const result = getEntitiesByType(store, 'Decision')
      expect(result).toHaveLength(2)
    })
  })

  describe('getEntitiesByTag', () => {
    it('returns empty array for non-existent tag', () => {
      const store = createKGStore()
      const result = getEntitiesByTag(store, 'nonexistent')
      expect(result).toEqual([])
    })

    it('returns all entities with given tag', () => {
      const store = createKGStore()
      addEntity(store, createTestEntity({ id: 'e1', tags: ['work', 'important'] }))
      addEntity(store, createTestEntity({ id: 'e2', tags: ['work'] }))
      addEntity(store, createTestEntity({ id: 'e3', tags: ['personal'] }))
      const result = getEntitiesByTag(store, 'work')
      expect(result).toHaveLength(2)
    })
  })
})
