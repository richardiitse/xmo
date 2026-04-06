import { describe, expect, it } from 'vitest'
import { codexAdapter } from './CodexAdapter.js'

const sampleSessionJsonl = `{"timestamp":"2026-04-06T10:25:31.477Z","type":"session_meta","payload":{"id":"019d6253-7b53-75c2-93aa-9d374024eae7","timestamp":"2026-04-06T10:25:31.477Z","cwd":"/Users/test/project"}}
{"timestamp":"2026-04-06T10:25:31.500Z","type":"response_item","payload":{"type":"message","role":"developer","content":[{"type":"input_text","text":"internal instructions"}]}}
{"timestamp":"2026-04-06T10:25:32.000Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"Please review https://example.com"}]}}
{"timestamp":"2026-04-06T10:25:33.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Use **TypeScript** for this change."}]}}
{"timestamp":"2026-04-06T10:25:34.000Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"pnpm test\\"}"}}
{"timestamp":"2026-04-06T10:25:35.000Z","type":"response_item","payload":{"type":"function_call_output","output":"tests passed"}}
`

describe('codexAdapter', () => {
  describe('name', () => {
    it('should have correct name', () => {
      expect(codexAdapter.name).toBe('codex')
    })
  })

  describe('sessionGlobs', () => {
    it('should contain Codex session glob pattern', () => {
      expect(codexAdapter.sessionGlobs).toHaveLength(1)
      expect(codexAdapter.sessionGlobs[0]).toContain('.codex/sessions/**/*.jsonl')
    })
  })

  async function createTestFile(filename: string, content: string): Promise<string> {
    const fs = await import('fs/promises')
    const os = await import('os')
    const path = await import('path')
    const fakeCodexPath = path.join(os.tmpdir(), '.codex', 'sessions', '2026', '04', '06', filename)
    await fs.mkdir(path.dirname(fakeCodexPath), { recursive: true })
    await fs.writeFile(fakeCodexPath, content)
    return fakeCodexPath
  }

  async function cleanupTestDir(): Promise<void> {
    const fs = await import('fs/promises')
    const os = await import('os')
    const path = await import('path')
    const dir = path.join(os.tmpdir(), '.codex')
    await fs.rm(dir, { recursive: true, force: true })
  }

  describe('parseSession', () => {
    it('should parse valid Codex JSONL and map developer messages to system role', async () => {
      const tmpFile = await createTestFile('rollout-test-session.jsonl', sampleSessionJsonl)

      const result = await codexAdapter.parseSession(tmpFile)

      expect(result.sessionId).toBe('019d6253-7b53-75c2-93aa-9d374024eae7')
      expect(result.startedAt).toBe('2026-04-06T10:25:31.477Z')
      expect(result.messages.some(message => message.role === 'system' && message.content.includes('internal instructions'))).toBe(true)
      expect(result.messages.some(message => message.role === 'user')).toBe(true)
      expect(result.messages.some(message => message.content.includes('[tool:exec_command]'))).toBe(true)
      expect(result.messages.some(message => message.role === 'tool' && message.content === 'tests passed')).toBe(true)

      await cleanupTestDir()
    })

    it('should tolerate malformed JSON lines', async () => {
      const content = `{"timestamp":"2026-04-06T10:25:31.477Z","type":"session_meta","payload":{"id":"codex-session","timestamp":"2026-04-06T10:25:31.477Z"}}
invalid json line
{"timestamp":"2026-04-06T10:25:32.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"valid"}]}}
`
      const tmpFile = await createTestFile('rollout-malformed.jsonl', content)

      const result = await codexAdapter.parseSession(tmpFile)

      expect(result.sessionId).toBe('codex-session')
      expect(result.messages).toHaveLength(1)

      await cleanupTestDir()
    })

    it('should filter out unknown roles by mapping them to null', async () => {
      // Unknown role values should be skipped (normalizeCodexRole returns null)
      const content = `{"timestamp":"2026-04-06T10:25:31.477Z","type":"session_meta","payload":{"id":"codex-session","timestamp":"2026-04-06T10:25:31.477Z"}}
{"timestamp":"2026-04-06T10:25:32.000Z","type":"response_item","payload":{"type":"message","role":"unknown_role","content":[{"type":"output_text","text":"should be filtered"}]}}
{"timestamp":"2026-04-06T10:25:33.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"valid message"}]}}
`
      const tmpFile = await createTestFile('rollout-unknown-role.jsonl', content)

      const result = await codexAdapter.parseSession(tmpFile)

      // Unknown role should be filtered out; only assistant message remains
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].content).toBe('valid message')
      expect(result.messages[0].role).toBe('assistant')

      await cleanupTestDir()
    })
  })

  describe('getLastModified', () => {
    it('should return a Date for valid file path', async () => {
      const fs = await import('fs/promises')
      const os = await import('os')
      const path = await import('path')
      const tmpFile = path.join(os.tmpdir(), `xmo-codex-mtime-${Date.now()}.jsonl`)

      await fs.writeFile(tmpFile, '{"type":"session_meta"}')

      const result = await codexAdapter.getLastModified(tmpFile)

      expect(result).toBeInstanceOf(Date)

      await fs.unlink(tmpFile)
    })
  })
})
