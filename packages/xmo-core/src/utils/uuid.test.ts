import { describe, it, expect } from 'vitest'
import { generateId, generateEntityId } from './uuid.js'

describe('uuid utilities', () => {
  describe('generateId', () => {
    it('generates a prefixed id', () => {
      const id = generateId('test')
      expect(typeof id).toBe('string')
      expect(id.startsWith('test_')).toBe(true)
    })

    it('generates unique ids', () => {
      const ids = new Set(Array(100).fill(null).map(() => generateId('unique')))
      expect(ids.size).toBe(100)
    })
  })

  describe('generateEntityId', () => {
    it('generates id with capitalized type prefix', () => {
      const id = generateEntityId('decision')
      expect(id.startsWith('Decision_')).toBe(true)
    })

    it('generates unique entity ids', () => {
      const ids = new Set(Array(100).fill(null).map(() => generateEntityId('test')))
      expect(ids.size).toBe(100)
    })
  })
})
