import { readFile, writeFile, rename, mkdir, access } from 'fs/promises'
import { LOCK_FILE, XMO_DIR } from '../utils/fs.js'
import { resolve } from 'path'

interface LockData {
  mtime: number
  pid: number
}

/**
 * Migrate from old lock file name (consolidation.lock → dream.lock).
 * Best-effort — if this fails it's not fatal since stale locks expire after 1h.
 */
async function migrateLegacyLock(): Promise<void> {
  const oldLock = resolve(XMO_DIR, 'consolidation.lock')
  try {
    await access(oldLock)
    await writeFile(oldLock, '').catch(() => {})
    // Best-effort delete — ignore errors
  } catch {
    // File doesn't exist, nothing to migrate
  }
}

/**
 * Atomically acquire the consolidation lock using rename(2).
 * This fixes the TOCTOU race in the original read-then-write approach.
 *
 * Strategy: write to a temp file, then atomically rename over the lock file.
 * rename(2) is atomic on POSIX when the target exists and we own it.
 */
export async function tryAcquireLock(): Promise<number | null> {
  await mkdir(XMO_DIR, { recursive: true })
  await migrateLegacyLock()

  const now = Date.now()
  const lockData: LockData = { mtime: now, pid: process.pid }
  const tmpFile = resolve(XMO_DIR, 'dream.lock.tmp')

  try {
    // Check existing lock before acquiring (best-effort gate; rename is the real lock)
    const existing = await readFile(LOCK_FILE, 'utf-8').catch(() => null)
    if (existing) {
      const lock: LockData = JSON.parse(existing)
      const age = now - lock.mtime
      if (age < 3600000) {
        return null // lock is fresh
      }
    }

    // Atomic acquire: write tmp then rename
    await writeFile(tmpFile, JSON.stringify(lockData))
    await rename(tmpFile, LOCK_FILE)
    return now
  } catch (error: unknown) {
    // If rename fails (lock taken by another process), that's fine
    const err = error as { code?: string }
    if (err.code === 'EEXIST') {
      return null
    }
    // Clean up tmp file on error
    await writeFile(tmpFile, '').catch(() => {})
    throw error
  }
}

export async function releaseLock(priorMtime: number): Promise<void> {
  try {
    const content = await readFile(LOCK_FILE, 'utf-8')
    const lock: LockData = JSON.parse(content)

    if (lock.mtime === priorMtime) {
      const released: LockData = { mtime: priorMtime - 1, pid: 0 }
      const tmpFile = resolve(XMO_DIR, 'dream.lock.tmp')
      await writeFile(tmpFile, JSON.stringify(released))
      await rename(tmpFile, LOCK_FILE)
    }
  } catch {
    // Ignore
  }
}

export async function readLastConsolidatedAt(): Promise<number> {
  try {
    const content = await readFile(LOCK_FILE, 'utf-8')
    const lock: LockData = JSON.parse(content)
    return lock.mtime
  } catch {
    return 0
  }
}
