import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runExtract } from './extract.js'

const {
  mockClaudeAdapter,
  mockCodexAdapter,
  mockOpenClawAdapter,
} = vi.hoisted(() => ({
  mockClaudeAdapter: {
    name: 'claude-code',
    sessionGlobs: ['~/.claude/sessions/*/transcript.json'],
    findSessions: vi.fn().mockResolvedValue([]),
    parseSession: vi.fn(),
    getLastModified: vi.fn(),
  },
  mockCodexAdapter: {
    name: 'codex',
    sessionGlobs: ['~/.codex/sessions/**/*.jsonl'],
    findSessions: vi.fn().mockResolvedValue([]),
    parseSession: vi.fn(),
    getLastModified: vi.fn(),
  },
  mockOpenClawAdapter: {
    name: 'openclaw',
    sessionGlobs: ['~/.openclaw/agents/*/sessions/*.jsonl'],
    findSessions: vi.fn().mockResolvedValue([]),
    parseSession: vi.fn(),
    getLastModified: vi.fn(),
  },
}))

vi.mock('@xmo/core', () => ({
  allAdapters: [mockClaudeAdapter, mockCodexAdapter, mockOpenClawAdapter],
  getAdapterByName: vi.fn((name: string) => {
    return [mockClaudeAdapter, mockCodexAdapter, mockOpenClawAdapter].find(adapter => adapter.name === name)
  }),
  isAdapterName: vi.fn((name: string) => ['claude-code', 'codex', 'openclaw'].includes(name)),
  extractFromTranscript: vi.fn().mockReturnValue([]),
  appendJSONL: vi.fn().mockResolvedValue(undefined),
  ensureXmoDir: vi.fn().mockResolvedValue(undefined),
  generateEntityId: vi.fn().mockReturnValue('test-entity-id'),
  KG_FILE: '/tmp/test/kg/entities.jsonl',
}))

describe('runExtract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-detects the latest session across adapters', async () => {
    const { extractFromTranscript, appendJSONL } = await import('@xmo/core')

    mockClaudeAdapter.findSessions.mockResolvedValue(['/tmp/claude.json'])
    mockClaudeAdapter.getLastModified.mockResolvedValue(new Date('2026-04-06T10:00:00.000Z'))
    mockCodexAdapter.findSessions.mockResolvedValue(['/tmp/codex.jsonl'])
    mockCodexAdapter.getLastModified.mockResolvedValue(new Date('2026-04-06T11:00:00.000Z'))
    mockCodexAdapter.parseSession.mockResolvedValue({
      sessionId: 'codex-session',
      messages: [{ role: 'assistant', content: 'Use **TypeScript**' }],
      startedAt: '2026-04-06T11:00:00.000Z',
    })
    vi.mocked(extractFromTranscript).mockReturnValue([
      {
        type: 'decision',
        name: 'TypeScript',
        confidence: 'high',
        matchedPatterns: ['bold'],
      },
    ])

    const result = await runExtract()

    expect(result).toContain('from codex session')
    expect(appendJSONL).toHaveBeenCalledWith(
      '/tmp/test/kg/entities.jsonl',
      expect.objectContaining({
        type: 'Decision',
        tags: expect.arrayContaining(['decision', 'high', 'source:codex']),
      })
    )
  })

  it('returns a clear message when no sessions are available', async () => {
    mockClaudeAdapter.findSessions.mockResolvedValue([])
    mockCodexAdapter.findSessions.mockResolvedValue([])
    mockOpenClawAdapter.findSessions.mockResolvedValue([])

    const result = await runExtract()

    expect(result).toBe('No supported sessions found.')
  })
})
