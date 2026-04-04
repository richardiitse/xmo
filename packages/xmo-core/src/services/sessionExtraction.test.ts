import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractFromAllSessions, extractFromSessions } from './sessionExtraction.js'

// Mock dependencies
vi.mock('../adapters/index.js', () => ({
  claudeCodeAdapter: {
    name: 'claude-code',
    sessionGlobs: ['~/.claude/sessions/*/transcript.json'],
    findSessions: vi.fn().mockResolvedValue([]),
    parseSession: vi.fn(),
    getLastModified: vi.fn(),
  },
  openClawAdapter: {
    name: 'openclaw',
    sessionGlobs: ['~/.openclaw/agents/*/sessions/*.jsonl'],
    findSessions: vi.fn().mockResolvedValue([]),
    parseSession: vi.fn(),
    getLastModified: vi.fn(),
  },
  extractFromTranscript: vi.fn().mockReturnValue([]),
}))

vi.mock('../utils/fs.js', () => ({
  KG_FILE: '/tmp/test/kg/entities.jsonl',
  ensureXmoDir: vi.fn().mockResolvedValue(undefined),
  appendJSONL: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../utils/uuid.js', () => ({
  generateEntityId: vi.fn().mockReturnValue('test-entity-id'),
}))

describe('sessionExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractFromAllSessions', () => {
    it('should return success with zero counts when no sessions found', async () => {
      const { claudeCodeAdapter, openClawAdapter } = await import('../adapters/index.js')
      ;(claudeCodeAdapter.findSessions as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(openClawAdapter.findSessions as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await extractFromAllSessions()

      expect(result.success).toBe(true)
      expect(result.sessionsFound).toBe(0)
      expect(result.entitiesExtracted).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should extract entities from sessions', async () => {
      const { claudeCodeAdapter, extractFromTranscript } = await import('../adapters/index.js')
      const { appendJSONL } = await import('../utils/fs.js')

      const mockTranscript = {
        sessionId: 'test-session',
        messages: [{ role: 'user' as const, content: 'Test message' }],
        startedAt: '2026-04-01T10:00:00.000Z',
      }

      const mockExtracted = [
        {
          type: 'decision' as const,
          name: 'Test Decision',
          confidence: 'high' as const,
          matchedPatterns: ['bold'],
        },
      ]

      ;(claudeCodeAdapter.findSessions as ReturnType<typeof vi.fn>).mockResolvedValue(['/path/to/session.jsonl'])
      ;(claudeCodeAdapter.parseSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockTranscript)
      ;(extractFromTranscript as ReturnType<typeof vi.fn>).mockReturnValue(mockExtracted)

      const result = await extractFromAllSessions()

      expect(result.success).toBe(true)
      expect(result.sessionsFound).toBe(1)
      expect(result.entitiesExtracted).toBe(1)
      expect(appendJSONL).toHaveBeenCalledTimes(1)
    })

    it('should handle adapter errors gracefully', async () => {
      const { claudeCodeAdapter } = await import('../adapters/index.js')
      ;(claudeCodeAdapter.findSessions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Adapter error'))

      const result = await extractFromAllSessions()

      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle session parse errors gracefully', async () => {
      const { claudeCodeAdapter, extractFromTranscript } = await import('../adapters/index.js')
      ;(claudeCodeAdapter.findSessions as ReturnType<typeof vi.fn>).mockResolvedValue(['/path/to/session.jsonl'])
      ;(claudeCodeAdapter.parseSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Parse error'))
      ;(extractFromTranscript as ReturnType<typeof vi.fn>).mockReturnValue([])

      const result = await extractFromAllSessions()

      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('extractFromSessions', () => {
    it('should return error for unknown adapter', async () => {
      const result = await extractFromSessions('unknown-adapter' as 'claude-code' | 'openclaw')

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Unknown adapter: unknown-adapter')
    })

    it('should extract from claude-code adapter only', async () => {
      const { claudeCodeAdapter, extractFromTranscript } = await import('../adapters/index.js')
      const { appendJSONL } = await import('../utils/fs.js')

      const mockTranscript = {
        sessionId: 'cc-session',
        messages: [{ role: 'user' as const, content: 'Claude Code message' }],
        startedAt: '2026-04-01T10:00:00.000Z',
      }

      const mockExtracted = [
        {
          type: 'concept' as const,
          name: 'Test Concept',
          confidence: 'medium' as const,
          matchedPatterns: ['capitalized'],
        },
      ]

      ;(claudeCodeAdapter.findSessions as ReturnType<typeof vi.fn>).mockResolvedValue(['/path/to/cc-session.jsonl'])
      ;(claudeCodeAdapter.parseSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockTranscript)
      ;(extractFromTranscript as ReturnType<typeof vi.fn>).mockReturnValue(mockExtracted)

      const result = await extractFromSessions('claude-code')

      expect(result.success).toBe(true)
      expect(result.sessionsFound).toBe(1)
      expect(result.entitiesExtracted).toBe(1)
    })

    it('should extract from openclaw adapter only', async () => {
      const { openClawAdapter, extractFromTranscript } = await import('../adapters/index.js')
      const { appendJSONL } = await import('../utils/fs.js')

      const mockTranscript = {
        sessionId: 'oc-session',
        messages: [{ role: 'assistant' as const, content: 'OpenClaw message' }],
        startedAt: '2026-04-01T10:00:00.000Z',
      }

      const mockExtracted = [
        {
          type: 'url' as const,
          name: 'https://example.com',
          confidence: 'low' as const,
          matchedPatterns: ['url'],
        },
      ]

      ;(openClawAdapter.findSessions as ReturnType<typeof vi.fn>).mockResolvedValue(['/path/to/oc-session.jsonl'])
      ;(openClawAdapter.parseSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockTranscript)
      ;(extractFromTranscript as ReturnType<typeof vi.fn>).mockReturnValue(mockExtracted)

      const result = await extractFromSessions('openclaw')

      expect(result.success).toBe(true)
      expect(result.sessionsFound).toBe(1)
      expect(result.entitiesExtracted).toBe(1)
    })

    it('should return failure when errors occur but no entities extracted', async () => {
      const { claudeCodeAdapter } = await import('../adapters/index.js')
      ;(claudeCodeAdapter.findSessions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Critical error'))

      const result = await extractFromSessions('claude-code')

      expect(result.success).toBe(false)
      expect(result.entitiesExtracted).toBe(0)
    })
  })
})
