import { appendJSONL, generateEntityId, KG_DIR } from '@xmo/core'
import type { ExtractedContent, ExtractionResult } from './types.js'
import type { Entity } from '@xmo/core'

const KG_FILE = `${KG_DIR}/entities.jsonl`

export async function extractEntities(
  contents: ExtractedContent[]
): Promise<ExtractionResult> {
  try {
    const entities: Entity[] = []

    for (const content of contents) {
      const entity: Entity = {
        id: generateEntityId(content.type),
        type: content.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: content.tags,
        properties: {
          title: content.title,
          content: content.content,
          ...content.properties,
        },
      }

      await appendJSONL(KG_FILE, entity)
      entities.push(entity)
    }

    return { success: true, entities }
  } catch (error) {
    return {
      success: false,
      entities: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}