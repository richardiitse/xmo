import { readJSONL, KG_DIR } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { getEmbedding, cosineSimilarity } from './embeddings.js'

const KG_FILE = `${KG_DIR}/entities.jsonl`

export interface QueryOptions {
  type?: string
  tags?: string[]
  limit?: number
  minSimilarity?: number
}

export interface QueryResult {
  entity: Entity
  score: number
}

export async function queryEntities(
  query: string,
  options: QueryOptions = {}
): Promise<QueryResult[]> {
  const entities = await readJSONL<Entity>(KG_FILE)

  if (entities.length === 0) {
    return []
  }

  const queryEmbedding = await getEmbedding(query)

  const results: QueryResult[] = []

  for (const entity of entities) {
    if (options.type && entity.type !== options.type) continue

    if (options.tags && options.tags.length > 0) {
      const hasTag = options.tags.some(tag => entity.tags.includes(tag))
      if (!hasTag) continue
    }

    const content = `${entity.properties.title} ${entity.properties.content}`
    const entityEmbedding = await getEmbedding(content)
    const score = await cosineSimilarity(queryEmbedding, entityEmbedding)

    if (options.minSimilarity && score < options.minSimilarity) continue

    results.push({ entity, score })
  }

  results.sort((a, b) => b.score - a.score)

  if (options.limit) {
    return results.slice(0, options.limit)
  }

  return results
}
