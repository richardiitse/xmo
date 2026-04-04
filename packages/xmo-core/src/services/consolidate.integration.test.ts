import { describe, it, expect, vi, beforeEach } from 'vitest'
import { consolidate } from './consolidate.js'

// Mock dependencies
vi.mock('./lock.js', () => ({
  tryAcquireLock: vi.fn(),
  releaseLock: vi.fn(),
  readLastConsolidatedAt: vi.fn(),
}))

vi.mock('../utils/fs.js', () => ({
  KG_DIR: '/tmp/test/kg',
  KG_FILE: '/tmp/test/kg/entities.jsonl',
  readJSONL: vi.fn(),
  ensureXmoDir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
}))

describe('consolidate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return error when time gate not passed', async () => {
    const { readLastConsolidatedAt } = await import('./lock.js')
    ;(readLastConsolidatedAt as ReturnType<typeof vi.fn>).mockResolvedValue(Date.now() - 3600000) // 1 hour ago

    const result = await consolidate({ minHours: 24, minSessions: 10 })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Time gate not passed')
  })

  it('should return error when lock not acquired', async () => {
    const { readLastConsolidatedAt, tryAcquireLock } = await import('./lock.js')
    ;(readLastConsolidatedAt as ReturnType<typeof vi.fn>).mockResolvedValue(0) // never consolidated
    ;(tryAcquireLock as ReturnType<typeof vi.fn>).mockResolvedValue(null) // lock not acquired

    const result = await consolidate({ minHours: 0, minSessions: 0 })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Lock not acquired')
  })

  it('should consolidate entities successfully', async () => {
    const { readLastConsolidatedAt, tryAcquireLock, releaseLock } = await import('./lock.js')
    const { readJSONL } = await import('../utils/fs.js')

    ;(readLastConsolidatedAt as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(tryAcquireLock as ReturnType<typeof vi.fn>).mockResolvedValue(Date.now())
    ;(releaseLock as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    // Mock entities that need consolidation
    const mockEntities = [
      {
        id: '1',
        type: 'Decision' as const,
        createdAt: '2026-04-01T10:00:00.000Z',
        updatedAt: '2026-04-01T10:00:00.000Z',
        tags: ['tag1'],
        properties: { name: 'Test Decision' },
      },
      {
        id: '2',
        type: 'Decision' as const,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
        tags: ['tag2'],
        properties: { name: 'Test Decision' },
      },
    ]

    ;(readJSONL as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntities)

    const result = await consolidate({ minHours: 0, minSessions: 0 })

    expect(result.success).toBe(true)
    expect(result.entitiesProcessed).toBe(1) // deduplicated to 1
    expect(result.entitiesPruned).toBe(1)
    // Note: releaseLock is called in catch block, not on success path
  })

  it('should handle empty entity list', async () => {
    const { readLastConsolidatedAt, tryAcquireLock, releaseLock } = await import('./lock.js')
    const { readJSONL } = await import('../utils/fs.js')

    ;(readLastConsolidatedAt as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(tryAcquireLock as ReturnType<typeof vi.fn>).mockResolvedValue(Date.now())
    ;(releaseLock as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
    ;(readJSONL as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const result = await consolidate({ minHours: 0, minSessions: 0 })

    expect(result.success).toBe(true)
    expect(result.entitiesProcessed).toBe(0)
    expect(result.entitiesPruned).toBe(0)
  })

  it('should prune stale entities', async () => {
    const { readLastConsolidatedAt, tryAcquireLock, releaseLock } = await import('./lock.js')
    const { readJSONL } = await import('../utils/fs.js')

    ;(readLastConsolidatedAt as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(tryAcquireLock as ReturnType<typeof vi.fn>).mockResolvedValue(Date.now())
    ;(releaseLock as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const oldDate = new Date(Date.now() - 100 * 86400000).toISOString()
    const mockEntities = [
      {
        id: '1',
        type: 'Decision' as const,
        createdAt: oldDate,
        updatedAt: oldDate,
        tags: [],
        properties: { name: 'Old Decision' },
      },
    ]

    ;(readJSONL as ReturnType<typeof vi.fn>).mockResolvedValue(mockEntities)

    const result = await consolidate({ minHours: 0, minSessions: 0, pruneAfterDays: 90 })

    expect(result.success).toBe(true)
    expect(result.entitiesProcessed).toBe(0) // pruned
    expect(result.entitiesPruned).toBe(1)
  })
})
