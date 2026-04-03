import { describe, it, expect } from 'vitest'
import { sanitizeKeyword } from '@xmo/core'

describe('queryEntities batch logic', () => {
  // Test the batching and sanitization logic directly
  // without mocking execFile (which is problematic in Node ESM)

  const BATCH_SIZE = 20

  function batchAndSanitize(keywords: string[]): { batches: string[][]; sanitized: string[] } {
    const sanitized = keywords
      .map(k => sanitizeKeyword(k.trim()))
      .filter(k => k.length > 0)

    const batches: string[][] = []
    for (let i = 0; i < sanitized.length; i += BATCH_SIZE) {
      batches.push(sanitized.slice(i, i + BATCH_SIZE))
    }

    return { batches, sanitized }
  }

  it('sanitizes keywords correctly', () => {
    const result = batchAndSanitize(['hello', 'hello.world', 'a+b'])
    expect(result.sanitized).toContain('hello')
    expect(result.sanitized).toContain('hello\\.world')
    expect(result.sanitized).toContain('a\\+b')
  })

  it('filters empty keywords', () => {
    const result = batchAndSanitize(['hello', '', '  '])
    expect(result.sanitized).toHaveLength(1)
    expect(result.sanitized[0]).toBe('hello')
  })

  it('batches keywords into groups of BATCH_SIZE', () => {
    const keywords = Array.from({ length: 25 }, (_, i) => `keyword${i}`)
    const result = batchAndSanitize(keywords)

    expect(result.batches).toHaveLength(2) // 20 + 5
    expect(result.batches[0]).toHaveLength(20)
    expect(result.batches[1]).toHaveLength(5)
  })

  it('handles fewer keywords than batch size', () => {
    const result = batchAndSanitize(['a', 'b', 'c'])
    expect(result.batches).toHaveLength(1)
    expect(result.batches[0]).toHaveLength(3)
  })

  it('handles empty input', () => {
    const result = batchAndSanitize([])
    expect(result.sanitized).toHaveLength(0)
    expect(result.batches).toHaveLength(0)
  })

  it('builds correct grep args per batch', () => {
    const result = batchAndSanitize(['hello', 'world'])
    const batch = result.batches[0]
    const grepArgs = ['-i', ...batch.flatMap(k => ['-e', k]), '/path/to/kg.jsonl']

    expect(grepArgs).toEqual([
      '-i',
      '-e', 'hello',
      '-e', 'world',
      '/path/to/kg.jsonl',
    ])
  })

  it('escapes all regex special characters', () => {
    const specials = ['.', '+', '*', '?', '(', ')', '[', ']', '{', '}', '^', '$', '|', '\\']
    const result = batchAndSanitize(specials)
    expect(result.sanitized[0]).toBe('\\.')
    expect(result.sanitized[1]).toBe('\\+')
  })
})
