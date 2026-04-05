import { describe, it, expect } from 'vitest'
import { formatEntityBrief, formatEntityDetail, formatMemoryBlock } from './formatter.js'
import type { Entity } from '../types/index.js'

function createEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'test-id',
    type: 'concept',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: ['test'],
    properties: {
      name: 'Test Entity',
      content: 'This is test content',
    },
    occurrences: 1,
    ...overrides,
  }
}

describe('formatter utilities', () => {
  describe('formatEntityBrief', () => {
    it('formats entity with name', () => {
      const entity = createEntity({ properties: { name: 'My Decision' } })
      const result = formatEntityBrief(entity)
      expect(result).toContain('concept')
      expect(result).toContain('My Decision')
    })

    it('formats entity with title instead of name', () => {
      const entity = createEntity({ properties: { title: 'My Title' } })
      const result = formatEntityBrief(entity)
      expect(result).toContain('My Title')
    })

    it('uses (unnamed) when no name or title', () => {
      const entity = createEntity({ properties: {} })
      const result = formatEntityBrief(entity)
      expect(result).toContain('(unnamed)')
    })

    it('shows occurrence count when > 1', () => {
      const entity = createEntity({ occurrences: 5 })
      const result = formatEntityBrief(entity)
      expect(result).toContain('×5')
    })

    it('shows lastSeenAt age', () => {
      const entity = createEntity({
        lastSeenAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      })
      const result = formatEntityBrief(entity)
      expect(result).toMatch(/2d ago|yesterday/)
    })
  })

  describe('formatEntityDetail', () => {
    it('formats entity with name and content', () => {
      const entity = createEntity({
        type: 'Decision',
        properties: { name: 'My Decision', content: 'Decision content' },
      })
      const result = formatEntityDetail(entity)
      expect(result).toContain('**My Decision**')
      expect(result).toContain('Decision content')
      expect(result).toContain('Decision')
    })

    it('shows tags when present', () => {
      const entity = createEntity({ tags: ['tag1', 'tag2'] })
      const result = formatEntityDetail(entity)
      expect(result).toContain('tag1, tag2')
    })

    it('shows occurrences when > 1', () => {
      const entity = createEntity({ occurrences: 3 })
      const result = formatEntityDetail(entity)
      expect(result).toContain('Seen 3 times')
    })
  })

  describe('formatMemoryBlock', () => {
    it('returns empty string for empty array', () => {
      const result = formatMemoryBlock([], 'TestProject')
      expect(result).toBe('')
    })

    it('formats header with project name', () => {
      const entities = [createEntity()]
      const result = formatMemoryBlock(entities, 'MyProject')
      expect(result).toContain('Memory: MyProject')
      expect(result).toContain('Found 1 relevant memory')
    })

    it('limits entities to maxEntities', () => {
      const entities = Array(25).fill(null).map((_, i) =>
        createEntity({ id: `id-${i}`, properties: { name: `Entity ${i}` } })
      )
      const result = formatMemoryBlock(entities, 'Test', { maxEntities: 5 })
      expect(result).toContain('(showing 5 of 25)')
    })

    it('truncates long content', () => {
      const entity = createEntity({
        properties: { name: 'Short', content: 'A'.repeat(300) }
      })
      const result = formatMemoryBlock([entity], 'Test', { maxContentLength: 50 })
      expect(result).toContain('...')
    })

    it('shows entity type and name', () => {
      const entity = createEntity({
        type: 'Decision',
        properties: { name: 'Test Decision' },
      })
      const result = formatMemoryBlock([entity], 'Test')
      expect(result).toContain('Decision')
      expect(result).toContain('Test Decision')
    })
  })
})
