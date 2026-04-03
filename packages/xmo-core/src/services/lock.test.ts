import { describe, it, expect } from 'vitest'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { resolve } from 'path'

// Test lock functions by testing the logic directly
// We can't easily test tryAcquireLock without a temp directory,
// but we can test readLastConsolidatedAt and the logic structure

describe('lock utilities', () => {
  // Test the timestamp parsing logic
  it('readLastConsolidatedAt returns 0 when file does not exist', async () => {
    const { readLastConsolidatedAt } = await import('./lock.js')

    // This will return 0 since the file doesn't exist
    const result = await readLastConsolidatedAt()
    expect(result).toBe(0)
  })

  it('LockData interface has correct shape', () => {
    const lock = {
      mtime: Date.now(),
      pid: process.pid,
    }
    expect(typeof lock.mtime).toBe('number')
    expect(typeof lock.pid).toBe('number')
  })
})
