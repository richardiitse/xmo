// Types
export type { Entity, EntityType, Relation, RelationType, KGStore } from './types/index.js';

// Schema functions
export { createKGStore, addEntity, getEntitiesByType, getEntitiesByTag } from './schema/entity.js';

// Utils
export {
  XMO_DIR,
  KG_DIR,
  EMBEDDINGS_DIR,
  LOCK_FILE,
  ensureXmoDir,
  readJSONL,
  appendJSONL,
} from './utils/fs.js';

export { generateId, generateEntityId } from './utils/uuid.js';
