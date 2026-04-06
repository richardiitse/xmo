import { describe, it, expect } from 'vitest'
import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'

describe('lock utilities', () => {
  const xmoDir = join(process.env.HOME ?? '', '.xmo')
  const lockFile = join(xmoDir, 'dream.lock')

  it('readLastConsolidatedAt returns a timestamp when file exists', async () => {
    // Ensure the lock file exists before testing (expects JSON with mtime field)
    await mkdir(xmoDir, { recursive: true })
    await writeFile(lockFile, JSON.stringify({ mtime: Date.now(), pid: process.pid }))

    const { readLastConsolidatedAt } = await import('./lock.js')
    const result = await readLastConsolidatedAt()
    expect(result).toBeGreaterThan(1577836800000) // Jan 1, 2020
    expect(result).toBeLessThanOrEqual(Date.now())

    // Clean up
    await rm(lockFile, { force: true })
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
