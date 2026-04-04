import { extractFromAllSessions, extractFromSessions } from '@xmo/core'

export const xmo_extract_sessions = {
  name: 'xmo_extract_sessions',
  description: 'Automatically extract entities from all session transcripts (Claude Code and OpenClaw)',
  inputSchema: {
    type: 'object',
    properties: {
      adapter: {
        type: 'string',
        enum: ['all', 'claude-code', 'openclaw'],
        default: 'all',
        description: 'Which adapter to extract from',
      },
    },
  },
}

export async function handleExtractSessions(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { adapter?: 'all' | 'claude-code' | 'openclaw' }
  const adapter = params.adapter ?? 'all'

  const result = adapter === 'all'
    ? await extractFromAllSessions()
    : await extractFromSessions(adapter)

  if (result.success) {
    return {
      content: [{
        type: 'text',
        text: `Session extraction complete. Sessions found: ${result.sessionsFound}, Entities extracted: ${result.entitiesExtracted}${result.errors.length > 0 ? `, Errors: ${result.errors.length}` : ''}`,
      }],
    }
  }

  return {
    content: [{
      type: 'text',
      text: `Session extraction failed: ${result.errors.join('; ')}`,
    }],
  }
}
