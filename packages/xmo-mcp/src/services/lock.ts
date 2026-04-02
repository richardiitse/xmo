import { readFile, writeFile } from 'fs/promises'
import { LOCK_FILE, XMO_DIR } from '@xmo/core'
import { mkdir } from 'fs/promises'

interface LockData {
  mtime: number
  pid: number
}

export async function tryAcquireLock(): Promise<number | null> {
  await mkdir(XMO_DIR, { recursive: true })

  try {
    const content = await readFile(LOCK_FILE, 'utf-8')
    const lock: LockData = JSON.parse(content)

    const age = Date.now() - lock.mtime
    if (age < 3600000) {
      return null
    }
  } catch {
    // Lock file doesn't exist, proceed
  }

  const mtime = Date.now()
  const lock: LockData = { mtime, pid: process.pid }
  await writeFile(LOCK_FILE, JSON.stringify(lock))

  return mtime
}

export async function releaseLock(priorMtime: number): Promise<void> {
  try {
    const content = await readFile(LOCK_FILE, 'utf-8')
    const lock: LockData = JSON.parse(content)

    if (lock.mtime === priorMtime) {
      await writeFile(LOCK_FILE, JSON.stringify({ mtime: priorMtime - 1, pid: 0 }))
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