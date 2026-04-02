import { loadStage1, loadStage2, loadStage3, type LoaderStage } from '../services/loader.js'

export const xmo_load = {
  name: 'xmo_load',
  description: 'Load memory into context',
  inputSchema: {
    type: 'object',
    properties: {
      stage: {
        type: 'number',
        enum: [1, 2, 3],
        description: 'Load stage: 1=core identity, 2=episodic, 3=semantic',
      },
      context: { type: 'string', description: 'Context for semantic search (stage 3)' },
      projectId: { type: 'string', description: 'Project ID for episodic memory (stage 2)' },
    },
    required: ['stage'],
  },
}

export async function handleLoad(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { stage: LoaderStage; context?: string; projectId?: string }

  let result
  switch (params.stage) {
    case 1:
      result = await loadStage1()
      break
    case 2:
      result = await loadStage2(params.projectId)
      break
    case 3:
      if (!params.context) {
        return { content: [{ type: 'text', text: 'Stage 3 requires context parameter' }] }
      }
      result = await loadStage3(params.context)
      break
    default:
      return { content: [{ type: 'text', text: 'Invalid stage' }] }
  }

  return {
    content: [{ type: 'text', text: result.content }],
  }
}