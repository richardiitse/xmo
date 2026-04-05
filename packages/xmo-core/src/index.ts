// Types
export type { Entity, EntityType, Relation, RelationType, KGStore } from './types/index.js';

// Adapters
export type { ToolAdapter, Message, SessionTranscript, ExtractedEntity } from './adapters/index.js';
export { claudeCodeAdapter, extractFromTranscript } from './adapters/ClaudeCodeAdapter.js';
export { openClawAdapter } from './adapters/OpenClawAdapter.js';

// Schema functions
export { createKGStore, addEntity, getEntitiesByType, getEntitiesByTag } from './schema/entity.js';

// Services
export type { ConsolidateConfig, ConsolidateResult } from './services/consolidate.js';
export { consolidate } from './services/consolidate.js';
export { tryAcquireLock, releaseLock, readLastConsolidatedAt } from './services/lock.js';
export type { SessionExtractionResult } from './services/sessionExtraction.js';
export { extractFromAllSessions, extractFromSessions } from './services/sessionExtraction.js';

// Utils
export {
  XMO_DIR,
  KG_DIR,
  KG_FILE,
  LOCK_FILE,
  ensureXmoDir,
  readJSONL,
  appendJSONL,
} from './utils/fs.js';

export { generateId, generateEntityId } from './utils/uuid.js';

export { sanitizeKeyword } from './utils/sanitize.js';

export { scanProject, generateSearchKeywords } from './utils/project.js';

export { formatMemoryBlock } from './utils/formatter.js';
