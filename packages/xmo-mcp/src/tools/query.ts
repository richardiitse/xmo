import { queryEntities } from '../services/query.js'

export const xmo_query = {
  name: 'xmo_query',
  description: 'Search memory using keyword/grep search',
  inputSchema: {
    type: 'object',
    properties: {
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Keywords to search for (AND logic across keywords)',
      },
      type: {
        type: 'string',
        enum: ['Decision', 'Finding', 'LessonLearned', 'Commitment', 'ContextSnapshot', 'url', 'person', 'concept', 'tool'],
        description: 'Filter by entity type',
      },
      limit: { type: 'number', default: 20 },
    },
    required: ['keywords'],
  },
}

export async function handleQuery(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { keywords: string[]; type?: string; limit?: number }
  const keywords = params.keywords ?? []
  if (keywords.length === 0) {
    return { content: [{ type: 'text', text: 'No keywords provided' }] }
  }

  const start = Date.now()
  const results = await queryEntities(keywords, {
    type: params.type,
    limit: params.limit || 20,
  })

  if (results.length === 0) {
    return { content: [{ type: 'text', text: 'No results found' }] }
  }

  const queryMs = Date.now() - start
  const output = results
    .map(r => {
      const name = (r.entity.properties.name as string | undefined) ?? (r.entity.properties.title as string | undefined) ?? '(unnamed)'
      const content = (r.entity.properties.content as string | undefined) ?? ''
      return `[${r.entity.type}] ${name} (matched: "${r.matchedKeyword}")\n${content}`
    })
    .join('\n\n---\n\n')

  const summary = `Found ${results.length} result(s) in ${queryMs}ms`
  return { content: [{ type: 'text', text: `${summary}\n\n${output}` }] }
}
