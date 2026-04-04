import { appendJSONL, generateEntityId, KG_FILE, ensureXmoDir } from '@xmo/core'
import type { ExtractedContent, ExtractionResult } from './types.js'
import type { Entity } from '@xmo/core'

export async function extractEntities(
  contents: ExtractedContent[]
): Promise<ExtractionResult> {
  try {
    await ensureXmoDir()
    const entities: Entity[] = []

    for (const content of contents) {
      const now = new Date().toISOString()
      const entity: Entity = {
        id: generateEntityId(content.type),
        type: content.type,
        extractedAt: now,
        lastSeenAt: now,
        occurrences: 1,
        createdAt: now,
        updatedAt: now,
        tags: content.tags,
        properties: {
          name: content.name ?? content.title,
          title: content.title,
          content: content.content,
          source: 'extract',
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