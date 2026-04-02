import { readJSONL, KG_DIR } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { queryEntities } from './query.js'

const KG_FILE = `${KG_DIR}/entities.jsonl`

export type LoaderStage = 1 | 2 | 3

export interface LoadResult {
  stage: LoaderStage
  entities: Entity[]
  content: string
}

export async function loadStage1(): Promise<LoadResult> {
  const entities = await readJSONL<Entity>(KG_FILE)

  const recent = new Map<string, Entity>()
  for (const entity of entities) {
    const key = entity.type
    if (!recent.has(key) || entity.updatedAt > recent.get(key)!.updatedAt) {
      recent.set(key, entity)
    }
  }

  const content = formatEntities(Array.from(recent.values()))

  return {
    stage: 1,
    entities: Array.from(recent.values()),
    content,
  }
}

export async function loadStage2(projectId?: string): Promise<LoadResult> {
  const entities = await readJSONL<Entity>(KG_FILE)

  entities.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const recent = entities.slice(0, 20)

  return {
    stage: 2,
    entities: recent,
    content: formatEntities(recent),
  }
}

export async function loadStage3(context: string): Promise<LoadResult> {
  const results = await queryEntities(context, { limit: 10 })

  return {
    stage: 3,
    entities: results.map(r => r.entity),
    content: formatEntities(results.map(r => r.entity)),
  }
}

function formatEntities(entities: Entity[]): string {
  if (entities.length === 0) {
    return 'No memory loaded.'
  }

  return entities
    .map(e => `[${e.type}] ${e.properties.title}\n${e.properties.content}`)
    .join('\n\n')
}