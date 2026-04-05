import { describe, it, expect, beforeEach } from 'vitest'
import { readJSONL, appendJSONL } from './fs.js'
import { writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'

describe('fs utilities', () => {
  const testDir = resolve('/tmp', 'xmo-fs-test-' + Date.now())
  const testFile = resolve(testDir, 'test.jsonl')

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true })
  })

  describe('readJSONL', () => {
    it('returns empty array for non-existent file', async () => {
      const result = await readJSONL('/non/existent/file.jsonl')
      expect(result).toEqual([])
    })

    it('returns empty array for empty file', async () => {
      await writeFile(testFile, '')
      const result = await readJSONL(testFile)
      expect(result).toEqual([])
    })

    it('parses valid JSONL content', async () => {
      const data = [
        { name: 'test1', value: 1 },
        { name: 'test2', value: 2 },
      ]
      await writeFile(testFile, data.map(d => JSON.stringify(d)).join('\n'))
      const result = await readJSONL(testFile)
      expect(result).toEqual(data)
    })

    it('skips malformed lines', async () => {
      const lines = [
        '{"valid": true}',
        'not json',
        '{"also": "valid"}',
      ]
      await writeFile(testFile, lines.join('\n'))
      const result = await readJSONL(testFile)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ valid: true })
      expect(result[1]).toEqual({ also: 'valid' })
    })
  })

  describe('appendJSONL', () => {
    beforeEach(async () => {
      // Clear the file before each append test
      await writeFile(testFile, '')
    })

    it('appends single object as JSON line', async () => {
      await appendJSONL(testFile, { appended: true })
      const content = await readJSONL(testFile)
      expect(content).toHaveLength(1)
      expect(content[0]).toEqual({ appended: true })
    })

    it('appends multiple objects on separate lines', async () => {
      await appendJSONL(testFile, { n: 1 })
      await appendJSONL(testFile, { n: 2 })
      const content = await readJSONL(testFile)
      expect(content).toHaveLength(2)
    })
  })
})
