/**
 * ToolAdapter Interface
 *
 * Allows XMO to extract entities from multiple AI coding tools
 * (Claude Code, OpenClaw, etc.) using a common interface.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp?: string
}

export interface SessionTranscript {
  sessionId: string
  messages: Message[]
  startedAt: string
  endedAt?: string
}

export interface ToolAdapter {
  /** Unique name of the tool */
  name: 'claude-code' | 'codex' | 'openclaw' | string

  /** Glob patterns to find session transcript files */
  sessionGlobs: string[]

  /**
   * Parse a session transcript file into a structured SessionTranscript.
   * @param filePath Absolute path to the transcript file
   */
  parseSession(filePath: string): Promise<SessionTranscript>

  /**
   * Get the last-modified time of a session directory.
   * Used to determine session recency for consolidation gating.
   */
  getLastModified(sessionDir: string): Promise<Date>

  /**
   * Find all session transcript file paths matching the adapter's globs.
   * Optional method; adapters that don't implement it will use glob directly.
   */
  findSessions?(): Promise<string[]>
}

/**
 * Extract entities from a transcript using pattern matching.
 * Patterns: url, @person, **bold**, capitalized phrase, tool invocations
 */
export interface ExtractedEntity {
  type: 'url' | 'person' | 'decision' | 'concept' | 'tool'
  name: string
  confidence: 'high' | 'medium' | 'low'
  matchedPatterns: string[]
  sessionId: string
  extractedAt: string
}
