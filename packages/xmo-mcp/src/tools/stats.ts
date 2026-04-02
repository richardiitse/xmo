import { readJSONL, KG_DIR } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { readLastConsolidatedAt } from '../services/lock.js'

export const xmo_stats = {
  name: 'xmo_stats',
  description: 'View memory statistics',
  inputSchema: {
    type: 'object',
    properties: {},
  },
}

export async function handleStats(_args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const entities = await readJSONL<Entity>(`${KG_DIR}/entities.jsonl`)
  const lastConsolidated = await readLastConsolidatedAt()

  const byType: Record<string, number> = {}
  for (const entity of entities) {
    byType[entity.type] = (byType[entity.type] || 0) + 1
  }

  const byTag: Record<string, number> = {}
  for (const entity of entities) {
    for (const tag of entity.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1
    }
  }

  const lastConsolidatedStr = lastConsolidated
    ? new Date(lastConsolidated).toLocaleString()
    : 'Never'

  const output = `
XMO Memory Statistics
======================
Total entities: ${entities.length}

By Type:
${Object.entries(byType).map(([type, count]) => `  ${type}: ${count}`).join('\n')}

Top Tags:
${Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => `  ${tag}: ${count}`).join('\n')}

Last Consolidation: ${lastConsolidatedStr}
`

  return { content: [{ type: 'text', text: output }] }
}