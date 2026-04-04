import type { Entity, EntityType } from '@xmo/core'

export interface ExtractedContent {
  type: EntityType
  title: string
  name?: string
  content: string
  tags: string[]
  properties: Record<string, unknown>
}

export interface ExtractionResult {
  success: boolean
  entities: Entity[]
  error?: string
}