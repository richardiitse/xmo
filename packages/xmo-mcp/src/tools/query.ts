import { queryEntities } from '../services/query.js'

export const xmo_query = {
  name: 'xmo_query',
  description: 'Semantic search across memory',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      type: {
        type: 'string',
        enum: ['Decision', 'Finding', 'LessonLearned', 'Commitment', 'ContextSnapshot'],
        description: 'Filter by entity type',
      },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
      limit: { type: 'number', default: 5 },
    },
    required: ['query'],
  },
}

export async function handleQuery(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { query: string; type?: string; tags?: string[]; limit?: number }

  const results = await queryEntities(params.query, {
    type: params.type,
    tags: params.tags,
    limit: params.limit || 5,
  })

  if (results.length === 0) {
    return { content: [{ type: 'text', text: 'No results found' }] }
  }

  const output = results
    .map(r => `[${r.entity.type}] ${r.entity.properties.title} (score: ${r.score.toFixed(3)})\n${r.entity.properties.content}`)
    .join('\n\n---\n\n')

  return { content: [{ type: 'text', text: output }] }
}
