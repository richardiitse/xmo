import { describe, it, expect } from 'vitest'
import { sanitizeKeyword } from './sanitize.js'

describe('sanitizeKeyword', () => {
  it('returns normal keywords unchanged', () => {
    expect(sanitizeKeyword('hello')).toBe('hello')
    expect(sanitizeKeyword('typescript')).toBe('typescript')
  })

  it('escapes regex special characters', () => {
    expect(sanitizeKeyword('hello.world')).toBe('hello\\.world')
    expect(sanitizeKeyword('a+b')).toBe('a\\+b')
    expect(sanitizeKeyword('a*b')).toBe('a\\*b')
    expect(sanitizeKeyword('a?b')).toBe('a\\?b')
    expect(sanitizeKeyword('(abc)')).toBe('\\(abc\\)')
    expect(sanitizeKeyword('[abc]')).toBe('\\[abc\\]')
    expect(sanitizeKeyword('{abc}')).toBe('\\{abc\\}')
    expect(sanitizeKeyword('a^b')).toBe('a\\^b')
    expect(sanitizeKeyword('a$b')).toBe('a\\$b')
    expect(sanitizeKeyword('a|b')).toBe('a\\|b')
    expect(sanitizeKeyword('a\\b')).toBe('a\\\\b')
  })

  it('handles empty string', () => {
    expect(sanitizeKeyword('')).toBe('')
  })

  it('handles strings with only special characters', () => {
    expect(sanitizeKeyword('***')).toBe('\\*\\*\\*')
    expect(sanitizeKeyword('...')).toBe('\\.\\.\\.')
  })

  it('preserves case with -i flag compatibility', () => {
    expect(sanitizeKeyword('Hello World')).toBe('Hello World')
  })
})
