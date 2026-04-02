import type { Entity, EntityType, KGStore } from '../types/index.js';

// Create a new empty KGStore
export function createKGStore(): KGStore {
  return {
    entities: new Map(),
    relations: new Map(),
    indexByType: new Map(),
    indexByTag: new Map(),
  };
}

// Add an entity to the store
export function addEntity(store: KGStore, entity: Entity): void {
  // Add to entities map
  store.entities.set(entity.id, entity);

  // Index by type
  const typeSet = store.indexByType.get(entity.type);
  if (typeSet) {
    typeSet.add(entity.id);
  } else {
    store.indexByType.set(entity.type, new Set([entity.id]));
  }

  // Index by tags
  for (const tag of entity.tags) {
    const tagSet = store.indexByTag.get(tag);
    if (tagSet) {
      tagSet.add(entity.id);
    } else {
      store.indexByTag.set(tag, new Set([entity.id]));
    }
  }
}

// Get entities by type
export function getEntitiesByType(
  store: KGStore,
  type: EntityType
): Entity[] {
  const ids = store.indexByType.get(type);
  if (!ids) {
    return [];
  }
  return Array.from(ids)
    .map((id) => store.entities.get(id))
    .filter((entity): entity is Entity => entity !== undefined);
}

// Get entities by tag
export function getEntitiesByTag(store: KGStore, tag: string): Entity[] {
  const ids = store.indexByTag.get(tag);
  if (!ids) {
    return [];
  }
  return Array.from(ids)
    .map((id) => store.entities.get(id))
    .filter((entity): entity is Entity => entity !== undefined);
}
