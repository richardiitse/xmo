// Entity Types
export type EntityType =
  | 'Decision'
  | 'Finding'
  | 'LessonLearned'
  | 'Commitment'
  | 'ContextSnapshot'
  | 'url'
  | 'person'
  | 'concept'
  | 'tool';

// Relation Types
export type RelationType =
  | 'led_to_decision'
  | 'decision_created'
  | 'fulfilled_by'
  | 'lesson_from'
  | 'related_to';

// Core Entity Interface
export interface Entity {
  id: string;
  type: EntityType;
  sessionId?: string;
  extractedAt?: string;
  lastSeenAt?: string;
  occurrences?: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  properties: {
    name?: string;
    title?: string;
    content?: string;
    source?: 'extract' | 'consolidation' | 'manual';
    confidence?: 'high' | 'medium' | 'low';
    [key: string]: unknown;
  };
}

// Core Relation Interface
export interface Relation {
  id: string;
  fromId: string;
  toId: string;
  type: RelationType;
  createdAt: string;
  properties: Record<string, unknown>;
}

// KGStore Interface
export interface KGStore {
  entities: Map<string, Entity>;
  relations: Map<string, Relation>;
  indexByType: Map<EntityType, Set<string>>;
  indexByTag: Map<string, Set<string>>;
}
