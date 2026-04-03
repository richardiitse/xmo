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
        enum: ['Decision', 'Finding', 'LessonLearned', 'Commitment', 'ContextSnapshot', 'url', 'person', 'concept', 'tool'],
        description: 'Type of entity to extract',
      },
      name: { type: 'string', description: 'Entity name/title' },
      content: { type: 'string', description: 'Detailed content' },
      tags: { type: 'array', items: { type: 'string' }, default: [] },
      properties: { type: 'object', description: 'Additional metadata' },
    },
    required: ['type', 'name', 'content'],
  },
}

export async function handleExtract(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { type: string; name: string; content: string; tags?: string[]; properties?: Record<string, unknown> }
  const extracted: ExtractedContent = {
    type: params.type as ExtractedContent['type'],
    title: params.name,
    content: params.content,
    tags: params.tags ?? [],
    properties: {
      name: params.name,
      source: 'manual',
      ...params.properties,
    },
  }

  const result = await extractEntities([extracted])

  if (result.success) {
    return {
      content: [{ type: 'text', text: `Extracted ${result.entities.length} entity(s)` }],
    }
  }

  return {
    content: [{ type: 'text', text: `Extraction failed: ${result.error}` }],
  }
}