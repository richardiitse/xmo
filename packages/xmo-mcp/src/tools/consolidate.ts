import { consolidate } from '../services/consolidate.js'

export const xmo_consolidate = {
  name: 'xmo_consolidate',
  description: 'Trigger memory consolidation (Dream)',
  inputSchema: {
    type: 'object',
    properties: {
      minHours: { type: 'number', description: 'Minimum hours since last consolidation', default: 0 },
      minSessions: { type: 'number', description: 'Minimum sessions since last consolidation', default: 0 },
    },
  },
}

export async function handleConsolidate(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { minHours?: number; minSessions?: number }

  const result = await consolidate({
    minHours: params.minHours ?? 0,
    minSessions: params.minSessions ?? 0,
  })

  if (result.success) {
    return {
      content: [{
        type: 'text',
        text: `Consolidation complete. Entities processed: ${result.entitiesProcessed}`,
      }],
    }
  }

  return {
    content: [{ type: 'text', text: `Consolidation skipped: ${result.error}` }],
  }
}