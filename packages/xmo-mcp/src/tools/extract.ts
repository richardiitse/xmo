import { extractEntities } from '../services/extract.js'
import type { ExtractedContent } from '../services/types.js'

export const xmo_extract = {
  name: 'xmo_extract',
  description: 'Extract key information from conversation into memory',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['Decision', 'Finding', 'LessonLearned', 'Commitment', 'ContextSnapshot'],
        description: 'Type of entity to extract',
      },
      title: { type: 'string', description: 'Brief title' },
      content: { type: 'string', description: 'Detailed content' },
      tags: { type: 'array', items: { type: 'string' }, default: [] },
    },
    required: ['type', 'title', 'content'],
  },
}

export async function handleExtract(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as ExtractedContent
  const result = await extractEntities([params])

  if (result.success) {
    return {
      content: [{ type: 'text', text: `Extracted ${result.entities.length} entity(s)` }],
    }
  }

  return {
    content: [{ type: 'text', text: `Extraction failed: ${result.error}` }],
  }
}