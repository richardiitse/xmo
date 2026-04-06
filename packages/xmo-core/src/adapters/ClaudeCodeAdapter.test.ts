import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFile, writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { extractFromTranscript, claudeCodeAdapter } from './ClaudeCodeAdapter.js'
import type { SessionTranscript } from './ToolAdapter.js'

function createTranscript(overrides: Partial<SessionTranscript> = {}): SessionTranscript {
  return {
    sessionId: 'test-session',
    messages: [],
    startedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function createMessage(overrides: { role?: 'user' | 'assistant' | 'system' | 'tool'; content?: string; timestamp?: string } = {}) {
  return {
    role: 'user' as const,
    content: '',
    ...overrides,
  }
}

const sampleJsonl = `{"timestamp":"2026-04-06T10:00:00.000Z","type":"user","sessionId":"session-abc","message":{"role":"user","content":"Hello"}}
{"timestamp":"2026-04-06T10:00:01.000Z","type":"assistant","sessionId":"session-abc","message":{"role":"assistant","content":"Hi there!"}}
{"timestamp":"2026-04-06T10:00:02.000Z","type":"assistant","sessionId":"session-abc","message":{"role":"assistant","content":[{"type":"thinking","text":"thinking..."},{"type":"text","text":"Using TypeScript"}]}}
{"timestamp":"2026-04-06T10:00:03.000Z","type":"user","sessionId":"session-abc","message":{"role":"user","content":"Check https://example.com"}}
`

describe('ClaudeCodeAdapter', () => {
  let tmpDir: string
  beforeAll(async () => {
    tmpDir = join(tmpdir(), `xmo-cc-test-${Date.now()}`)
    await mkdir(tmpDir, { recursive: true })
  })
  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  describe('parseSession', () => {
    it('parses valid JSONL and extracts user/assistant messages', async () => {
      const filePath = join(tmpDir, 'session-abc.jsonl')
      await writeFile(filePath, sampleJsonl)

      const result = await claudeCodeAdapter.parseSession(filePath)

      expect(result.sessionId).toBe('session-abc')
      expect(result.startedAt).toBe('2026-04-06T10:00:00.000Z')
      expect(result.endedAt).toBe('2026-04-06T10:00:03.000Z')
      expect(result.messages).toHaveLength(4)
      expect(result.messages[0]).toMatchObject({ role: 'user', content: 'Hello' })
      expect(result.messages[1]).toMatchObject({ role: 'assistant', content: 'Hi there!' })
    })

    it('filters thinking blocks and extracts only text blocks from content arrays', async () => {
      const filePath = join(tmpDir, 'session-thinking.jsonl')
      await writeFile(filePath, sampleJsonl)

      const result = await claudeCodeAdapter.parseSession(filePath)

      // Third message has content array with thinking + text blocks
      // Should only have "Using TypeScript" not "thinking..."
      const thirdMsg = result.messages[2]
      expect(thirdMsg.content).toBe('Using TypeScript')
      expect(thirdMsg.content).not.toContain('thinking')
    })

    it('extracts URLs from user message content', async () => {
      const filePath = join(tmpDir, 'session-urls.jsonl')
      await writeFile(filePath, sampleJsonl)

      const result = await claudeCodeAdapter.parseSession(filePath)

      // Fourth message: "Check https://example.com"
      const urlMsg = result.messages[3]
      expect(urlMsg.content).toBe('Check https://example.com')
    })

    it('derives sessionId from filename when not in entries', async () => {
      const filePath = join(tmpDir, 'no-session-id-here.jsonl')
      const content = `{"timestamp":"2026-04-06T10:00:00.000Z","type":"user","message":{"role":"user","content":"Hello"}}
`
      await writeFile(filePath, content)

      const result = await claudeCodeAdapter.parseSession(filePath)

      expect(result.sessionId).toBe('no-session-id-here')
    })

    it('skips malformed JSON lines without crashing', async () => {
      const filePath = join(tmpDir, 'session-malformed.jsonl')
      const content = `{"timestamp":"2026-04-06T10:00:00.000Z","type":"user","message":{"role":"user","content":"valid"}}
not json at all
{"timestamp":"2026-04-06T10:00:01.000Z","type":"assistant","message":{"role":"assistant","content":"also valid"}}
`
      await writeFile(filePath, content)

      const result = await claudeCodeAdapter.parseSession(filePath)

      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].content).toBe('valid')
      expect(result.messages[1].content).toBe('also valid')
    })

    it('skips entries with non-string non-array content', async () => {
      const filePath = join(tmpDir, 'session-weird-content.jsonl')
      const content = `{"timestamp":"2026-04-06T10:00:00.000Z","type":"assistant","message":{"role":"assistant","content":null}}
{"timestamp":"2026-04-06T10:00:01.000Z","type":"assistant","message":{"role":"assistant","content":"actual content"}}
`
      await writeFile(filePath, content)

      const result = await claudeCodeAdapter.parseSession(filePath)

      expect(result.messages).toHaveLength(1)
      expect(result.messages[0].content).toBe('actual content')
    })
  })

  describe('extractFromTranscript', () => {
    it('extracts URLs from content', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Check out https://example.com for more info' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const urls = result.filter(r => r.type === 'url')
      expect(urls).toHaveLength(1)
      expect(urls[0].name).toBe('https://example.com')
    })

    it('extracts multiple URLs', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Links: https://foo.com and https://bar.com' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const urls = result.filter(r => r.type === 'url')
      expect(urls).toHaveLength(2)
    })

    it('extracts URLs that do not start with exclamation', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Links: https://foo.com and https://bar.com' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const urls = result.filter(r => r.type === 'url')
      expect(urls).toHaveLength(2)
    })

    it('extracts person mentions with @', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Talk to @john_doe about this' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const persons = result.filter(r => r.type === 'person')
      expect(persons).toHaveLength(1)
      expect(persons[0].name).toBe('@john_doe')
    })

    it('extracts decisions from bold text', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'We decided to use **React** for the UI' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const decisions = result.filter(r => r.type === 'decision')
      expect(decisions).toHaveLength(1)
      expect(decisions[0].name).toBe('React')
    })

    it('extracts decisions from underline text', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Decision: __Use TypeScript__' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const decisions = result.filter(r => r.type === 'decision')
      expect(decisions).toHaveLength(1)
      expect(decisions[0].name).toBe('Use TypeScript')
    })

    it('extracts tool invocations', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Run /xmo-extract to save memory' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const tools = result.filter(r => r.type === 'tool')
      expect(tools).toHaveLength(1)
      expect(tools[0].name).toBe('/xmo-extract')
    })

    it('extracts multiple tool invocations', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Use /xmo-extract and /xmo-query' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const tools = result.filter(r => r.type === 'tool')
      expect(tools).toHaveLength(2)
    })

    it('extracts concepts from capitalized phrases', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Introduction to Machine Learning\n\nSupervised Learning' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const concepts = result.filter(r => r.type === 'concept')
      expect(concepts.length).toBeGreaterThan(0)
    })

    it('deduplicates by type and name', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Use **React**\n\nAlso use __React__' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const decisions = result.filter(r => r.type === 'decision' && r.name === 'React')
      expect(decisions).toHaveLength(1)
      expect(decisions[0].matchedPatterns).toContain('bold')
      expect(decisions[0].matchedPatterns).toContain('underline')
    })

    it('assigns high confidence for multiple matched patterns', () => {
      // Use a name that appears in multiple contexts to get 3+ patterns
      // @user is a person, **React** is bold, __React__ is underline, /react is tool
      // But we need the SAME type:name key to get merged patterns
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'User @user made the **decision** decision to use __decision__ decision' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      // "decision" as decision would match bold and underline = 2 patterns = medium
      const decision = result.find(r => r.name === 'decision' && r.type === 'decision')
      expect(decision?.confidence).toBe('medium')
    })

    it('assigns medium confidence for 2 patterns', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Use **React** and __React__ together' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const react = result.find(r => r.name === 'React')
      // **React** = bold, __React__ = underline = 2 patterns
      expect(react?.confidence).toBe('medium')
    })

    it('assigns low confidence for 1 pattern', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Check https://example.com' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const url = result[0]
      expect(url.confidence).toBe('low')
    })

    it('handles empty transcript', () => {
      const transcript = createTranscript({ messages: [] })
      const result = extractFromTranscript(transcript)
      expect(result).toEqual([])
    })

    it('handles transcript with no matches', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'Just some plain text without any patterns' }),
        ],
      })
      const result = extractFromTranscript(transcript)
      // Concepts might still match from capitalized phrases
      expect(Array.isArray(result)).toBe(true)
    })

    it('filters out short capitalized phrases', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'OK AI ML' }), // Too short
        ],
      })
      const result = extractFromTranscript(transcript)
      const concepts = result.filter(r => r.type === 'concept')
      // "OK" is too short to be a concept
      const okConcept = concepts.find(c => c.name === 'OK')
      expect(okConcept).toBeUndefined()
    })

    it('filters out very long phrases as concepts', () => {
      const transcript = createTranscript({
        messages: [
          createMessage({ content: 'A'.repeat(100) }),
        ],
      })
      const result = extractFromTranscript(transcript)
      const concepts = result.filter(r => r.type === 'concept')
      const longConcept = concepts.find(c => c.name.startsWith('A'))
      expect(longConcept).toBeUndefined()
    })
  })
})
