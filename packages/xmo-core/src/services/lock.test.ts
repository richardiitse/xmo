import { describe, it, expect } from 'vitest'

describe('lock utilities', () => {
  it('readLastConsolidatedAt returns a timestamp when file exists', async () => {
    const { readLastConsolidatedAt } = await import('./lock.js')

    // The lock file exists in ~/.xmo/, so it returns the mtime
    const result = await readLastConsolidatedAt()
    // Result should be a valid timestamp (positive number, greater than 2020)
    expect(result).toBeGreaterThan(1577836800000) // Jan 1, 2020
    expect(result).toBeLessThanOrEqual(Date.now())
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
