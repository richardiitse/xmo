// Entity Types
export type EntityType =
  | 'Decision'
  | 'Finding'
  | 'LessonLearned'
  | 'Commitment'
  | 'ContextSnapshot';

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
  createdAt: string;
  updatedAt: string;
  tags: string[];
  properties: Record<string, unknown>;
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
