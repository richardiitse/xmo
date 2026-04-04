import { describe, it, expect } from 'vitest'
import { openClawAdapter } from './OpenClawAdapter.js'

// Sample JSONL content for testing
const sampleSessionJsonl = `{"type":"session","version":3,"id":"test-session-123","timestamp":"2026-04-01T10:00:00.000Z","cwd":"/Users/test/.openclaw/workspace"}
{"type":"message","id":"msg-1","parentId":"session","timestamp":"2026-04-01T10:00:01.000Z","message":{"role":"user","content":[{"type":"text","text":"Hello, this is a test conversation"}],"timestamp":1743500401000}}
{"type":"message","id":"msg-2","parentId":"msg-1","timestamp":"2026-04-01T10:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"**Important decision**: Use TypeScript for type safety"}],"timestamp":1743500402000}}
{"type":"message","id":"msg-3","parentId":"msg-2","timestamp":"2026-04-01T10:00:03.000Z","message":{"role":"tool","content":[{"type":"toolResult","toolName":"exec","content":[{"text":"Build completed successfully"}]}],"timestamp":1743500403000}}
{"type":"message","id":"msg-4","parentId":"msg-3","timestamp":"2026-04-01T10:00:04.000Z","message":{"role":"assistant","content":[{"type":"toolCall","name":"exec","arguments":{"cmd":"npm test"}}],"timestamp":1743500404000}}
{"type":"message","id":"msg-5","parentId":"msg-4","timestamp":"2026-04-01T10:00:05.000Z","message":{"role":"user","content":[{"type":"text","text":"Check https://example.com for more info"}],"timestamp":1743500405000}}
{"type":"message","id":"msg-6","parentId":"msg-5","timestamp":"2026-04-01T10:00:06.000Z","message":{"role":"user","content":[{"type":"text","text":"@john please review this code"}],"timestamp":1743500406000}}
{"type":"message","id":"msg-7","parentId":"msg-6","timestamp":"2026-04-01T10:00:07.000Z","message":{"role":"assistant","content":[{"type":"thinking","thinking":"This looks like a simple task"}],"timestamp":1743500407000}}
`

describe('openClawAdapter', () => {
  describe('name', () => {
    it('should have correct name', () => {
      expect(openClawAdapter.name).toBe('openclaw')
    })
  })

  describe('sessionGlobs', () => {
    it('should contain OpenClaw session glob pattern', () => {
      expect(openClawAdapter.sessionGlobs).toHaveLength(1)
      expect(openClawAdapter.sessionGlobs[0]).toContain('.openclaw/agents/*/sessions/*.jsonl')
    })
  })

  // Helper to create test file with proper OpenClaw path structure
  async function createTestFile(filename: string, content: string): Promise<string> {
    const fs = await import('fs/promises')
    const os = await import('os')
    const path = await import('path')
    // Use path that matches the .openclaw/agents/*/sessions/ pattern
    const fakeOpenClawPath = path.join(os.tmpdir(), '.openclaw', 'agents', 'test-agent', 'sessions', filename)
    await fs.mkdir(path.dirname(fakeOpenClawPath), { recursive: true })
    await fs.writeFile(fakeOpenClawPath, content)
    return fakeOpenClawPath
  }

  async function cleanupTestDir(): Promise<void> {
    const fs = await import('fs/promises')
    const os = await import('os')
    const path = await import('path')
    // Clean up the .openclaw directory structure
    const dir = path.join(os.tmpdir(), '.openclaw')
    await fs.rm(dir, { recursive: true, force: true })
  }

  describe('parseSession', () => {
    it('should parse valid JSONL and extract messages', async () => {
      const tmpFile = await createTestFile('test-session.jsonl', sampleSessionJsonl)

      const result = await openClawAdapter.parseSession(tmpFile)

      expect(result.sessionId).toBe('test-session-123')
      // Messages: user text, assistant text (bold decision), tool result, tool call, user text, user text, thinking
      expect(result.messages.length).toBeGreaterThanOrEqual(1)

      await cleanupTestDir()
    })

    it('should handle malformed JSON lines gracefully', async () => {
      const content = `{"type":"session","id":"s1","timestamp":"2026-04-01T10:00:00.000Z"}
invalid json line
{"type":"message","id":"msg-1","timestamp":"2026-04-01T10:00:01.000Z","message":{"role":"user","content":[{"type":"text","text":"Valid message"}]}}
`
      const tmpFile = await createTestFile('malformed.jsonl', content)

      const result = await openClawAdapter.parseSession(tmpFile)

      expect(result.sessionId).toBe('s1')
      expect(result.messages.length).toBeGreaterThanOrEqual(1)

      await cleanupTestDir()
    })

    it('should extract text content from message blocks', async () => {
      const content = `{"type":"session","id":"s2","timestamp":"2026-04-01T10:00:00.000Z"}
{"type":"message","id":"msg-1","timestamp":"2026-04-01T10:00:01.000Z","message":{"role":"user","content":[{"type":"text","text":"User message text"}]}}
`
      const tmpFile = await createTestFile('text-content.jsonl', content)

      const result = await openClawAdapter.parseSession(tmpFile)

      const userMessage = result.messages.find(m => m.role === 'user')
      expect(userMessage?.content).toBe('User message text')

      await cleanupTestDir()
    })

    it('should extract toolCall blocks as assistant messages', async () => {
      const content = `{"type":"session","id":"s3","timestamp":"2026-04-01T10:00:00.000Z"}
{"type":"message","id":"msg-1","timestamp":"2026-04-01T10:00:01.000Z","message":{"role":"assistant","content":[{"type":"toolCall","name":"exec","arguments":{"cmd":"ls"}}]}}
`
      const tmpFile = await createTestFile('toolcall.jsonl', content)

      const result = await openClawAdapter.parseSession(tmpFile)

      const toolCallMessage = result.messages.find(m => m.content.includes('[tool:exec]'))
      expect(toolCallMessage?.role).toBe('assistant')
      expect(toolCallMessage?.content).toContain('[tool:exec]')

      await cleanupTestDir()
    })

    it('should extract toolResult blocks', async () => {
      const content = `{"type":"session","id":"s4","timestamp":"2026-04-01T10:00:00.000Z"}
{"type":"message","id":"msg-1","timestamp":"2026-04-01T10:00:01.000Z","message":{"role":"tool","content":[{"type":"toolResult","toolName":"exec","content":[{"text":"Output line 1"},{"text":"Output line 2"}]}]}}
`
      const tmpFile = await createTestFile('toolresult.jsonl', content)

      const result = await openClawAdapter.parseSession(tmpFile)

      const toolResultMessage = result.messages.find(m => m.role === 'tool')
      expect(toolResultMessage?.content).toContain('Output line 1')
      expect(toolResultMessage?.content).toContain('Output line 2')

      await cleanupTestDir()
    })

    it('should extract thinking blocks', async () => {
      const content = `{"type":"session","id":"s5","timestamp":"2026-04-01T10:00:00.000Z"}
{"type":"message","id":"msg-1","timestamp":"2026-04-01T10:00:01.000Z","message":{"role":"assistant","content":[{"type":"thinking","thinking":"Let me think about this..."}]}}
`
      const tmpFile = await createTestFile('thinking.jsonl', content)

      const result = await openClawAdapter.parseSession(tmpFile)

      const thinkingMessage = result.messages.find(m => m.content.includes('[thinking]'))
      expect(thinkingMessage?.content).toContain('Let me think about this...')

      await cleanupTestDir()
    })

    it('should handle session without messages', async () => {
      const content = `{"type":"session","id":"s6","timestamp":"2026-04-01T10:00:00.000Z"}
`
      const tmpFile = await createTestFile('empty-session.jsonl', content)

      const result = await openClawAdapter.parseSession(tmpFile)

      expect(result.sessionId).toBe('s6')
      expect(result.messages).toHaveLength(0)

      await cleanupTestDir()
    })

    it('should extract startedAt from session entry', async () => {
      const content = `{"type":"session","id":"s7","timestamp":"2026-04-01T10:00:00.000Z"}
`
      const tmpFile = await createTestFile('start-time.jsonl', content)

      const result = await openClawAdapter.parseSession(tmpFile)

      expect(result.startedAt).toBe('2026-04-01T10:00:00.000Z')

      await cleanupTestDir()
    })
  })

  describe('findSessions', () => {
    it('should be a function', () => {
      expect(typeof openClawAdapter.findSessions).toBe('function')
    })
  })

  describe('getLastModified', () => {
    it('should return a Date for valid file path', async () => {
      const fs = await import('fs/promises')
      const os = await import('os')
      const path = await import('path')
      const tmpFile = path.join(os.tmpdir(), `xmo-mtime-${Date.now()}.jsonl`)

      await fs.writeFile(tmpFile, '{"type":"session"}')

      const result = await openClawAdapter.getLastModified(tmpFile)

      expect(result).toBeInstanceOf(Date)

      // Clean up
      await fs.unlink(tmpFile)
    })
  })
})
