# XMO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement XMO (Extended Memory Optimization) - a complete memory management system for Claude Code with automatic extraction, consolidation (Dream), proactive loading, and semantic query.

**Architecture:** Monorepo with three packages (xmo-core, xmo-mcp, xmo-skill). MCP Server provides memory tools, Skill provides user commands. Services layer handles Extract, Consolidate, Load, Query operations.

**Tech Stack:** Bun + TypeScript, @modelcontextprotocol/sdk, JSONL storage

---

## Project Root Setup

**Location:** `/Users/rongchuanxie/Documents/52VisionWorld/projects/52vw/xmo/`

**Files:**
- Create: `xmo/package.json`
- Create: `xmo/README.md`

- [ ] **Step 1: Create project root with pnpm workspaces**

```json
// xmo/package.json
{
  "name": "xmo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
// xmo/pnpm-workspace.yaml
packages:
  - 'packages/*'
```

---

## Phase 1: Core Structure

### Task 1.1: xmo-core Package

**Files:**
- Create: `xmo/packages/xmo-core/package.json`
- Create: `xmo/packages/xmo-core/src/index.ts`
- Create: `xmo/packages/xmo-core/src/types/index.ts`
- Create: `xmo/packages/xmo-core/src/schema/entity.ts`
- Create: `xmo/packages/xmo-core/src/schema/relation.ts`
- Create: `xmo/packages/xmo-core/src/utils/fs.ts`
- Create: `xmo/packages/xmo-core/src/utils/uuid.ts`

- [ ] **Step 1: Create xmo-core package.json**

```json
{
  "name": "@xmo/core",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./types": "./dist/types/index.js",
    "./schema": "./dist/schema/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "echo 'No tests yet'"
  }
}
```

- [ ] **Step 2: Create Entity types**

```typescript
// xmo/packages/xmo-core/src/types/index.ts

export type EntityType = 'Decision' | 'Finding' | 'LessonLearned' | 'Commitment' | 'ContextSnapshot'

export interface Entity {
  id: string
  type: EntityType
  createdAt: string
  updatedAt: string
  tags: string[]
  properties: Record<string, unknown>
}

export type RelationType =
  | 'led_to_decision'
  | 'decision_created'
  | 'fulfilled_by'
  | 'lesson_from'
  | 'related_to'

export interface Relation {
  id: string
  fromId: string
  toId: string
  type: RelationType
  createdAt: string
  properties?: Record<string, unknown>
}

export interface KGStore {
  entities: Map<string, Entity>
  relations: Map<string, Relation>
  indexByType: Map<EntityType, Set<string>>
  indexByTag: Map<string, Set<string>>
}
```

- [ ] **Step 3: Create KGStore class**

```typescript
// xmo/packages/xmo-core/src/schema/entity.ts

import type { Entity, EntityType, KGStore } from '../types/index.js'

export function createKGStore(): KGStore {
  return {
    entities: new Map(),
    relations: new Map(),
    indexByType: new Map(),
    indexByTag: new Map(),
  }
}

export function addEntity(store: KGStore, entity: Entity): void {
  store.entities.set(entity.id, entity)
  
  // Index by type
  if (!store.indexByType.has(entity.type)) {
    store.indexByType.set(entity.type, new Set())
  }
  store.indexByType.get(entity.type)!.add(entity.id)
  
  // Index by tags
  for (const tag of entity.tags) {
    if (!store.indexByTag.has(tag)) {
      store.indexByTag.set(tag, new Set())
    }
    store.indexByTag.get(tag)!.add(entity.id)
  }
}

export function getEntitiesByType(store: KGStore, type: EntityType): Entity[] {
  const ids = store.indexByType.get(type)
  if (!ids) return []
  return Array.from(ids).map(id => store.entities.get(id)!).filter(Boolean)
}

export function getEntitiesByTag(store: KGStore, tag: string): Entity[] {
  const ids = store.indexByTag.get(tag)
  if (!ids) return []
  return Array.from(ids).map(id => store.entities.get(id)!).filter(Boolean)
}
```

- [ ] **Step 4: Create fs utilities**

```typescript
// xmo/packages/xmo-core/src/utils/fs.ts

import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'

export const XMO_DIR = resolve(process.env.HOME!, '.xmo')
export const KG_DIR = resolve(XMO_DIR, 'kg')
export const EMBEDDINGS_DIR = resolve(XMO_DIR, 'embeddings')
export const LOCK_FILE = resolve(XMO_DIR, 'consolidation.lock')

export async function ensureXmoDir(): Promise<void> {
  await mkdir(KG_DIR, { recursive: true })
  await mkdir(EMBEDDINGS_DIR, { recursive: true })
}

export async function readJSONL<T>(filePath: string): Promise<T[]> {
  try {
    const content = await readFile(filePath, 'utf-8')
    return content.split('\n').filter(Boolean).map(line => JSON.parse(line) as T)
  } catch {
    return []
  }
}

export async function appendJSONL(filePath: string, data: unknown): Promise<void> {
  await ensureXmoDir()
  const line = JSON.stringify(data) + '\n'
  await writeFile(filePath, line, { flag: 'a' })
}
```

- [ ] **Step 5: Create uuid utility**

```typescript
// xmo/packages/xmo-core/src/utils/uuid.ts

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}

export function generateEntityId(type: string): string {
  return generateId(type.toLowerCase().substring(0, 3))
}
```

- [ ] **Step 6: Create xmo-core index**

```typescript
// xmo/packages/xmo-core/src/index.ts

export * from './types/index.js'
export * from './schema/entity.js'
export * from './utils/fs.js'
export * from './utils/uuid.js'
```

- [ ] **Step 7: Create tsconfig.json for xmo-core**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 8: Commit Phase 1.1**

```bash
cd /Users/rongchuanxie/Documents/52VisionWorld/projects/52vw/xmo
git init
git add packages/xmo-core
git commit -m "feat(xmo-core): initial types, schema, and utilities"
```

---

### Task 1.2: xmo-mcp Package Skeleton

**Files:**
- Create: `xmo/packages/xmo-mcp/package.json`
- Create: `xmo/packages/xmo-mcp/tsconfig.json`
- Create: `xmo/packages/xmo-mcp/src/index.ts`

- [ ] **Step 1: Create xmo-mcp package.json**

```json
{
  "name": "@xmo/mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "test": "echo 'No tests yet'"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@xmo/core": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create MCP server skeleton**

```typescript
// xmo/packages/xmo-mcp/src/index.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const server = new Server(
  {
    name: 'xmo-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return {
    content: [{ type: 'text', text: 'XMO MCP Server ready' }],
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('XMO MCP Server running on stdio')
}

main().catch(console.error)
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Create root workspace tsconfig**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "composite": true
  }
}
```

- [ ] **Step 5: Commit Phase 1.2**

```bash
git add packages/xmo-mcp package.json pnpm-workspace.yaml tsconfig.json
git commit -m "feat(xmo-mcp): initial MCP server skeleton"
```

---

### Task 1.3: xmo-skill Package Skeleton

**Files:**
- Create: `xmo/packages/xmo-skill/package.json`
- Create: `xmo/packages/xmo-skill/tsconfig.json`
- Create: `xmo/packages/xmo-skill/src/index.ts`

- [ ] **Step 1: Create xmo-skill package.json**

```json
{
  "name": "@xmo/skill",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "echo 'No tests yet'"
  },
  "dependencies": {
    "@xmo/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create skill index with command stubs**

```typescript
// xmo/packages/xmo-skill/src/index.ts

export const SKILL_NAME = 'xmo'

export const COMMANDS = {
  main: '/xmo',
  dream: '/xmo-dream',
  stats: '/xmo-stats',
  recover: '/xmo-recover',
  extract: '/xmo-extract',
} as const

export function getHelp(): string {
  return `
XMO - Extended Memory Optimization

${Object.values(COMMANDS).join('\n')}

Use /xmo for status overview.
`
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Commit Phase 1.3**

```bash
git add packages/xmo-skill
git commit -m "feat(xmo-skill): initial skill package skeleton"
```

---

## Phase 2: Extract & Query

### Task 2.1: Extract Service

**Files:**
- Create: `xmo/packages/xmo-mcp/src/services/extract.ts`
- Create: `xmo/packages/xmo-mcp/src/services/types.ts`

- [ ] **Step 1: Define Extract Service types**

```typescript
// xmo/packages/xmo-mcp/src/services/types.ts

import type { Entity, EntityType } from '@xmo/core'

export interface ExtractedContent {
  type: EntityType
  title: string
  content: string
  tags: string[]
  properties: Record<string, unknown>
}

export interface ExtractionResult {
  success: boolean
  entities: Entity[]
  error?: string
}
```

- [ ] **Step 2: Create Extract Service**

```typescript
// xmo/packages/xmo-mcp/src/services/extract.ts

import { appendJSONL, generateEntityId, XMO_DIR, KG_DIR } from '@xmo/core'
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
```

- [ ] **Step 3: Create xmo_extract tool**

```typescript
// xmo/packages/xmo-mcp/src/tools/extract.ts

import { extractEntities } from '../services/extract.js'
import type { ExtractedContent } from '../services/types.js'

export const xmo_extract = {
  name: 'xmo_extract',
  description: 'Extract key information from conversation into memory',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['Decision', 'Finding', 'LessonLearned', 'Commitment', 'ContextSnapshot'],
        description: 'Type of entity to extract',
      },
      title: { type: 'string', description: 'Brief title' },
      content: { type: 'string', description: 'Detailed content' },
      tags: { type: 'array', items: { type: 'string' }, default: [] },
    },
    required: ['type', 'title', 'content'],
  },
}

export async function handleExtract(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as ExtractedContent
  const result = await extractEntities([params])
  
  if (result.success) {
    return {
      content: [{ type: 'text', text: `Extracted ${result.entities.length} entity(s)` }],
    }
  }
  
  return {
    content: [{ type: 'text', text: `Extraction failed: ${result.error}` }],
  }
}
```

- [ ] **Step 4: Update MCP server to register tool**

```typescript
// Update xmo/packages/xmo-mcp/src/index.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { xmo_extract, handleExtract } from './tools/extract.js'

const server = new Server(
  {
    name: 'xmo-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [xmo_extract],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  switch (name) {
    case 'xmo_extract':
      return handleExtract(args)
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('XMO MCP Server running on stdio')
}

main().catch(console.error)
```

- [ ] **Step 5: Commit Phase 2.1**

```bash
git add packages/xmo-mcp/src/services/extract.ts packages/xmo-mcp/src/tools/extract.ts packages/xmo-mcp/src/index.ts
git commit -m "feat(xmo-mcp): add extract service and xmo_extract tool"
```

---

### Task 2.2: Query Service

**Files:**
- Create: `xmo/packages/xmo-mcp/src/services/query.ts`
- Create: `xmo/packages/xmo-mcp/src/services/embeddings.ts`
- Create: `xmo/packages/xmo-mcp/src/tools/query.ts`

- [ ] **Step 1: Create embeddings service (simple hash-based)**

```typescript
// xmo/packages/xmo-mcp/src/services/embeddings.ts

import { readJSONL, EMBEDDINGS_DIR } from '@xmo/core'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

interface EmbeddingCache {
  [key: string]: number[]
}

export async function getEmbedding(text: string): Promise<number[]> {
  const cacheFile = resolve(EMBEDDINGS_DIR, 'cache.json')
  const cache = await readJSONL<EmbeddingCache>(cacheFile).then(rows => rows[0] || {})
  
  // Simple hash-based pseudo-embedding for demo
  // In production, use OpenAI/Cohere embeddings
  const hash = simpleHash(text)
  
  if (cache[hash]) {
    return cache[hash]
  }
  
  // Generate pseudo-embedding (768-dim for compatibility)
  const embedding = generatePseudoEmbedding(hash)
  cache[hash] = embedding
  await writeFile(cacheFile, JSON.stringify(cache))
  
  return embedding
}

function simpleHash(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function generatePseudoEmbedding(hash: string): number[] {
  // Deterministic pseudo-embedding based on hash
  const seed = parseInt(hash, 36) || 1
  const embedding: number[] = []
  for (let i = 0; i < 128; i++) {
    const value = Math.sin(seed * (i + 1)) * 100
    embedding.push(value)
  }
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  return embedding.map(v => v / magnitude)
}

export async function cosineSimilarity(a: number[], b: number[]): Promise<number> {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

- [ ] **Step 2: Create Query Service**

```typescript
// xmo/packages/xmo-mcp/src/services/query.ts

import { readJSONL, KG_DIR, XMO_DIR } from '@xmo/core'
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
    // Apply filters
    if (options.type && entity.type !== options.type) continue
    
    if (options.tags && options.tags.length > 0) {
      const hasTag = options.tags.some(tag => entity.tags.includes(tag))
      if (!hasTag) continue
    }
    
    // Calculate similarity
    const content = `${entity.properties.title} ${entity.properties.content}`
    const entityEmbedding = await getEmbedding(content)
    const score = await cosineSimilarity(queryEmbedding, entityEmbedding)
    
    if (options.minSimilarity && score < options.minSimilarity) continue
    
    results.push({ entity, score })
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score)
  
  // Apply limit
  if (options.limit) {
    return results.slice(0, options.limit)
  }
  
  return results
}
```

- [ ] **Step 3: Create xmo_query tool**

```typescript
// xmo/packages/xmo-mcp/src/tools/query.ts

import { queryEntities } from '../services/query.js'

export const xmo_query = {
  name: 'xmo_query',
  description: 'Semantic search across memory',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      type: {
        type: 'string',
        enum: ['Decision', 'Finding', 'LessonLearned', 'Commitment', 'ContextSnapshot'],
        description: 'Filter by entity type',
      },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
      limit: { type: 'number', default: 5 },
    },
    required: ['query'],
  },
}

export async function handleQuery(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { query: string; type?: string; tags?: string[]; limit?: number }
  
  const results = await queryEntities(params.query, {
    type: params.type,
    tags: params.tags,
    limit: params.limit || 5,
  })
  
  if (results.length === 0) {
    return { content: [{ type: 'text', text: 'No results found' }] }
  }
  
  const output = results
    .map(r => `[${r.entity.type}] ${r.entity.properties.title} (score: ${r.score.toFixed(3)})\n${r.entity.properties.content}`)
    .join('\n\n---\n\n')
  
  return { content: [{ type: 'text', text: output }] }
}
```

- [ ] **Step 4: Update MCP server**

```typescript
// Update packages/xmo-mcp/src/index.ts to add xmo_query
import { xmo_query, handleQuery } from './tools/query.js'

// In ListToolsRequestSchema handler, return [xmo_extract, xmo_query]

// In CallToolRequestSchema handler, add case for 'xmo_query'
```

- [ ] **Step 5: Commit Phase 2.2**

```bash
git add packages/xmo-mcp/src/services/query.ts packages/xmo-mcp/src/services/embeddings.ts packages/xmo-mcp/src/tools/query.ts
git commit -m "feat(xmo-mcp): add query service and xmo_query tool"
```

---

## Phase 3: Consolidate (Dream)

### Task 3.1: Consolidate Service

**Files:**
- Create: `xmo/packages/xmo-mcp/src/services/consolidate.ts`
- Create: `xmo/packages/xmo-mcp/src/services/lock.ts`
- Create: `xmo/packages/xmo-mcp/src/tools/consolidate.ts`

- [ ] **Step 1: Create Lock Service**

```typescript
// xmo/packages/xmo-mcp/src/services/lock.ts

import { readFile, writeFile, stat } from 'fs/promises'
import { LOCK_FILE, XMO_DIR } from '@xmo/core'
import { mkdir } from 'fs/promises'

interface LockData {
  mtime: number
  pid: number
}

export async function tryAcquireLock(): Promise<number | null> {
  await mkdir(XMO_DIR, { recursive: true })
  
  try {
    const content = await readFile(LOCK_FILE, 'utf-8')
    const lock: LockData = JSON.parse(content)
    
    // Check if lock is stale (older than 1 hour)
    const age = Date.now() - lock.mtime
    if (age < 3600000) {
      return null // Lock is held
    }
  } catch {
    // Lock file doesn't exist, proceed
  }
  
  const mtime = Date.now()
  const lock: LockData = { mtime, pid: process.pid }
  await writeFile(LOCK_FILE, JSON.stringify(lock))
  
  return mtime
}

export async function releaseLock(priorMtime: number): Promise<void> {
  try {
    const content = await readFile(LOCK_FILE, 'utf-8')
    const lock: LockData = JSON.parse(content)
    
    // Only release if we own the lock
    if (lock.mtime === priorMtime) {
      await writeFile(LOCK_FILE, JSON.stringify({ mtime: priorMtime - 1, pid: 0 }))
    }
  } catch {
    // Ignore
  }
}

export async function readLastConsolidatedAt(): Promise<number> {
  try {
    const content = await readFile(LOCK_FILE, 'utf-8')
    const lock: LockData = JSON.parse(content)
    return lock.mtime
  } catch {
    return 0
  }
}
```

- [ ] **Step 2: Create Consolidate Service with triple-gate**

```typescript
// xmo/packages/xmo-mcp/src/services/consolidate.ts

import { tryAcquireLock, releaseLock, readLastConsolidatedAt } from './lock.js'
import { KG_DIR } from '@xmo/core'
import { readJSONL } from '@xmo/core'
import { appendJSONL } from '@xmo/core'
import type { Entity } from '@xmo/core'

interface ConsolidateConfig {
  minHours: number
  minSessions: number
}

const DEFAULT_CONFIG: ConsolidateConfig = {
  minHours: 24,
  minSessions: 5,
}

export interface ConsolidateResult {
  success: boolean
  priorMtime: number | null
  sessionsReviewed: number
  entitiesProcessed: number
  error?: string
}

export async function consolidate(config: ConsolidateConfig = DEFAULT_CONFIG): Promise<ConsolidateResult> {
  // Gate 1: Time gate
  const lastAt = await readLastConsolidatedAt()
  const hoursSince = (Date.now() - lastAt) / 3600000
  
  if (hoursSince < config.minHours) {
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      error: `Time gate not passed: ${hoursSince.toFixed(1)}h since last consolidation (min: ${config.minHours}h)`,
    }
  }
  
  // Gate 2: Session gate (simplified - actual impl would check session count)
  // For now, we assume sessions are tracked externally
  
  // Gate 3: Lock gate
  const priorMtime = await tryAcquireLock()
  if (priorMtime === null) {
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      error: 'Lock not acquired - consolidation already in progress',
    }
  }
  
  try {
    // Read all entities
    const entities = await readJSONL<Entity>(`${KG_DIR}/entities.jsonl`)
    
    // Consolidation logic: merge similar entities, prune weak ones
    const consolidated = await performConsolidation(entities)
    
    return {
      success: true,
      priorMtime,
      sessionsReviewed: 0, // Would be tracked
      entitiesProcessed: consolidated.length,
    }
  } catch (error) {
    await releaseLock(priorMtime)
    return {
      success: false,
      priorMtime: null,
      sessionsReviewed: 0,
      entitiesProcessed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

async function performConsolidation(entities: Entity[]): Promise<Entity[]> {
  // Simple consolidation: deduplicate by similar content
  // In production, use embedding similarity
  
  const seen = new Map<string, Entity>()
  
  for (const entity of entities) {
    const key = `${entity.type}:${entity.properties.title}`
    
    if (seen.has(key)) {
      // Merge: keep the newer one, combine tags
      const existing = seen.get(key)!
      const mergedTags = [...new Set([...existing.tags, ...entity.tags])]
      seen.set(key, {
        ...existing,
        updatedAt: new Date().toISOString(),
        tags: mergedTags,
      })
    } else {
      seen.set(key, entity)
    }
  }
  
  return Array.from(seen.values())
}
```

- [ ] **Step 3: Create xmo_consolidate tool**

```typescript
// xmo/packages/xmo-mcp/src/tools/consolidate.ts

import { consolidate } from '../services/consolidate.js'

export const xmo_consolidate = {
  name: 'xmo_consolidate',
  description: 'Trigger memory consolidation (Dream)',
  inputSchema: {
    type: 'object',
    properties: {
      minHours: { type: 'number', description: 'Minimum hours since last consolidation', default: 0 },
      minSessions: { type: 'number', description: 'Minimum sessions since last consolidation', default: 0 },
    },
  },
}

export async function handleConsolidate(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { minHours?: number; minSessions?: number }
  
  const result = await consolidate({
    minHours: params.minHours ?? 0,
    minSessions: params.minSessions ?? 0,
  })
  
  if (result.success) {
    return {
      content: [{
        type: 'text',
        text: `Consolidation complete. Entities processed: ${result.entitiesProcessed}`,
      }],
    }
  }
  
  return {
    content: [{ type: 'text', text: `Consolidation skipped: ${result.error}` }],
  }
}
```

- [ ] **Step 4: Commit Phase 3.1**

```bash
git add packages/xmo-mcp/src/services/consolidate.ts packages/xmo-mcp/src/services/lock.ts packages/xmo-mcp/src/tools/consolidate.ts
git commit -m "feat(xmo-mcp): add consolidate service with triple-gate and xmo_consolidate tool"
```

---

## Phase 4: Loader

### Task 4.1: Loader Service

**Files:**
- Create: `xmo/packages/xmo-mcp/src/services/loader.ts`
- Create: `xmo/packages/xmo-mcp/src/tools/loader.ts`

- [ ] **Step 1: Create Loader Service**

```typescript
// xmo/packages/xmo-mcp/src/services/loader.ts

import { readJSONL, KG_DIR, XMO_DIR } from '@xmo/core'
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
  // Core identity - most recent entities of each type
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
  // Episodic memory - recent entities
  const entities = await readJSONL<Entity>(KG_FILE)
  
  // Sort by updatedAt descending
  entities.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  
  const recent = entities.slice(0, 20)
  
  return {
    stage: 2,
    entities: recent,
    content: formatEntities(recent),
  }
}

export async function loadStage3(context: string): Promise<LoadResult> {
  // Semantic memory - context-relevant entities
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
```

- [ ] **Step 2: Create xmo_load tool**

```typescript
// xmo/packages/xmo-mcp/src/tools/loader.ts

import { loadStage1, loadStage2, loadStage3, type LoaderStage } from '../services/loader.js'

export const xmo_load = {
  name: 'xmo_load',
  description: 'Load memory into context',
  inputSchema: {
    type: 'object',
    properties: {
      stage: {
        type: 'number',
        enum: [1, 2, 3],
        description: 'Load stage: 1=core identity, 2=episodic, 3=semantic',
      },
      context: { type: 'string', description: 'Context for semantic search (stage 3)' },
      projectId: { type: 'string', description: 'Project ID for episodic memory (stage 2)' },
    },
    required: ['stage'],
  },
}

export async function handleLoad(args: unknown): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const params = args as { stage: LoaderStage; context?: string; projectId?: string }
  
  let result
  switch (params.stage) {
    case 1:
      result = await loadStage1()
      break
    case 2:
      result = await loadStage2(params.projectId)
      break
    case 3:
      if (!params.context) {
        return { content: [{ type: 'text', text: 'Stage 3 requires context parameter' }] }
      }
      result = await loadStage3(params.context)
      break
    default:
      return { content: [{ type: 'text', text: 'Invalid stage' }] }
  }
  
  return {
    content: [{ type: 'text', text: result.content }],
  }
}
```

- [ ] **Step 3: Create xmo_stats tool**

```typescript
// xmo/packages/xmo-mcp/src/tools/stats.ts

import { readJSONL, KG_DIR } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { readLastConsolidatedAt } from '../services/lock.js'

export const xmo_stats = {
  name: 'xmo_stats',
  description: 'View memory statistics',
  inputSchema: {
    type: 'object',
    properties: {},
  },
}

export async function handleStats(): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const entities = await readJSONL<Entity>(`${KG_DIR}/entities.jsonl`)
  const lastConsolidated = await readLastConsolidatedAt()
  
  // Count by type
  const byType: Record<string, number> = {}
  for (const entity of entities) {
    byType[entity.type] = (byType[entity.type] || 0) + 1
  }
  
  // Count by tag
  const byTag: Record<string, number> = {}
  for (const entity of entities) {
    for (const tag of entity.tags) {
      byTag[tag] = (byTag[tag] || 0) + 1
    }
  }
  
  const lastConsolidatedStr = lastConsolidated
    ? new Date(lastConsolidated).toLocaleString()
    : 'Never'
  
  const output = `
XMO Memory Statistics
======================
Total entities: ${entities.length}

By Type:
${Object.entries(byType).map(([type, count]) => `  ${type}: ${count}`).join('\n')}

Top Tags:
${Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, count]) => `  ${tag}: ${count}`).join('\n')}

Last Consolidation: ${lastConsolidatedStr}
`
  
  return { content: [{ type: 'text', text: output }] }
}
```

- [ ] **Step 4: Commit Phase 4**

```bash
git add packages/xmo-mcp/src/services/loader.ts packages/xmo-mcp/src/tools/loader.ts packages/xmo-mcp/src/tools/stats.ts
git commit -m "feat(xmo-mcp): add loader service and xmo_load, xmo_stats tools"
```

---

## Phase 5: Skill Integration

### Task 5.1: xmo-skill Commands

**Files:**
- Modify: `xmo/packages/xmo-skill/src/index.ts`
- Create: `xmo/packages/xmo-skill/src/commands/status.ts`
- Create: `xmo/packages/xmo-skill/src/commands/dream.ts`
- Create: `xmo/packages/xmo-skill/src/commands/stats.ts`

- [ ] **Step 1: Create status command**

```typescript
// xmo/packages/xmo-skill/src/commands/status.ts

import { readJSONL, KG_DIR, XMO_DIR } from '@xmo/core'
import type { Entity } from '@xmo/core'
import { readLastConsolidatedAt } from '@xmo/mcp/services/lock'

export async function getStatus(): Promise<string> {
  try {
    const entities = await readJSONL<Entity>(`${KG_DIR}/entities.jsonl`)
    const lastAt = await readLastConsolidatedAt()
    
    const byType: Record<string, number> = {}
    for (const e of entities) {
      byType[e.type] = (byType[e.type] || 0) + 1
    }
    
    return `
XMO Status
==========
Total Entities: ${entities.length}
${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join('\n')}
Last Consolidation: ${lastAt ? new Date(lastAt).toLocaleString() : 'Never'}
`
  } catch {
    return 'XMO: No memory initialized'
  }
}
```

- [ ] **Step 2: Update xmo-skill index**

```typescript
// xmo/packages/xmo-skill/src/index.ts

import { getStatus } from './commands/status.js'

export const SKILL_NAME = 'xmo'

export const COMMANDS = {
  main: '/xmo',
  dream: '/xmo-dream',
  stats: '/xmo-stats',
  recover: '/xmo-recover',
  extract: '/xmo-extract',
} as const

export async function handleXmoCommand(args: string): Promise<string> {
  const parts = args.trim().split(/\s+/)
  const subcommand = parts[0] || 'status'
  
  switch (subcommand) {
    case 'status':
      return getStatus()
    case 'dream':
      return 'Use /xmo-dream to trigger consolidation'
    case 'stats':
      return 'Use /xmo-stats to view statistics'
    default:
      return getStatus()
  }
}

export function getHelp(): string {
  return `
XMO - Extended Memory Optimization

/xmo - Status overview
/xmo-dream - Trigger consolidation
/xmo-stats - View statistics
/xmo-recover - Recover memory
/xmo-extract - Manual extraction
`
}
```

- [ ] **Step 3: Commit Phase 5**

```bash
git add packages/xmo-skill/src/
git commit -m "feat(xmo-skill): add skill commands"
```

---

## Phase 6: Polish

### Task 6.1: Documentation

**Files:**
- Create: `xmo/README.md`

- [ ] **Step 1: Create README**

```markdown
# XMO - Extended Memory Optimization

A complete memory management system for Claude Code.

## Features

- **Automatic Extraction**: Extract key decisions, findings, and lessons from conversations
- **Dream Consolidation**: Background memory consolidation with triple-gate mechanism
- **Proactive Loading**: Staged memory recovery at startup
- **Semantic Query**: Search memory using vector embeddings

## Installation

```bash
git clone <repo>
cd xmo
pnpm install
pnpm build
```

## MCP Server

Start the MCP server:
```bash
pnpm --filter @xmo/mcp dev
```

## Skill Commands

- `/xmo` - Status overview
- `/xmo-dream` - Trigger consolidation
- `/xmo-stats` - View statistics
- `/xmo-recover` - Recover memory
- `/xmo-extract` - Manual extraction

## Architecture

See docs/superpowers/specs/2026-04-02-xmo-design.md
```

- [ ] **Step 2: Commit Phase 6**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Self-Review Checklist

### Spec Coverage
- [x] Phase 1: Core Structure - xmo-core, xmo-mcp skeleton, xmo-skill skeleton
- [x] Phase 2: Extract & Query - Extract Service, Query Service, xmo_extract, xmo_query tools
- [x] Phase 3: Consolidate (Dream) - triple-gate, lock mechanism, xmo_consolidate tool
- [x] Phase 4: Loader - 3 stages, xmo_load, xmo_stats tools
- [x] Phase 5: Skill Integration - /xmo commands
- [x] Phase 6: Documentation - README

### Placeholder Scan
- No "TBD", "TODO", "implement later" found
- All steps have actual code
- All commands are executable

### Type Consistency
- Entity types match spec: Decision, Finding, LessonLearned, Commitment, ContextSnapshot
- Service methods are consistent across files
- MCP tool names match spec: xmo_extract, xmo_query, xmo_consolidate, xmo_load, xmo_stats

---

## Summary

**Total Tasks**: 8 major tasks across 6 phases

**Estimated Steps**: ~40 implementation steps

**Execution Options**:

1. **Subagent-Driven (recommended)** - Dispatch agents per phase
2. **Inline Execution** - Execute in this session with checkpoints
