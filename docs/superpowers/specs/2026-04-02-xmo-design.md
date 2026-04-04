# XMO (Extended Memory Optimization) Design

**Date**: 2026-04-02
**Status**: Approved
**Version**: 1.0

---

## 1. Overview

**Project Name**: XMO (Extended Memory Optimization)

**Goal**: Provide a complete memory management system for Claude Code, inspired by Kairos architecture patterns from the leaked Claude Code source.

**Core Functions**:
- Automatic memory extraction from conversations
- Automatic memory consolidation (Dream) with progress tracking
- Proactive memory loading (staged recovery)
- Semantic query with vector embeddings

---

## 2. Architecture

XMO follows a modular architecture with three packages:

```
xmo/
├── packages/
│   ├── xmo-core/           # Shared library
│   ├── xmo-mcp/           # MCP Server
│   └── xmo-skill/          # Skill Package
└── README.md
```

### 2.1 Package Responsibilities

| Package | Responsibility |
|---------|----------------|
| `xmo-core` | Shared types, schema definitions, utilities |
| `xmo-mcp` | MCP Server providing memory operation tools |
| `xmo-skill` | User interaction commands (/xmo, /dream, etc.) |

### 2.2 System Diagram

```
┌─────────────────────────────────────────────────────┐
│                 Claude Code CLI                      │
│  ┌─────────────┐    ┌─────────────────────────────┐│
│  │ xmo-skill   │    │       xmo-mcp Server       ││
│  │ /xmo, /dream│◄──►│                             ││
│  │ /stats      │    │  ┌─────────┐ ┌───────────┐  ││
│  └─────────────┘    │  │ Extract │ │ Consolidate│  ││
│                     │  │ Service │ │  Service  │  ││
│                     │  └─────────┘ └───────────┘  ││
│                     │  ┌─────────┐ ┌───────────┐  ││
│                     │  │ Loader  │ │   Query   │  ││
│                     │  │ Service │ │  Service  │  ││
│                     │  └─────────┘ └───────────┘  ││
│                     │            │                ││
│                     │     ┌──────▼──────┐         ││
│                     │     │  XMO KG     │         ││
│                     │     │  (JSONL)    │         ││
│                     │     └─────────────┘         ││
│                     └─────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 3. Module Design

### 3.1 Extract Service

**Purpose**: Automatically extract key information from conversations.

**Triggers**:
- End of session
- After significant tool_use completions
- Manual trigger via `/xmo-extract`

**Extracted Content**:
- Decisions made
- Key findings/discoveries
- Lessons learned
- Commitments made
- Context snapshots

**Storage**: JSONL format → Knowledge Graph

### 3.2 Consolidate Service (Dream)

**Purpose**: Background memory consolidation with triple-gate mechanism.

**Gates**:
1. **Time Gate**: Minimum 24 hours since last consolidation
2. **Session Gate**: At least 5 sessions since last consolidation
3. **Lock Gate**: No other process mid-consolidation (file lock)

**DreamTask Tracking**:
- Phase: `starting` → `updating`
- Files touched during consolidation
- Progress visible in Claude Code UI

**Lock Mechanism**:
- File-based lock at `~/.xmo/consolidation.lock`
- Mtime tracking for retry logic
- Rollback on failure

### 3.3 Loader Service

**Purpose**: Proactive memory recovery at startup.

**Stages**:
| Stage | Content | Timing |
|-------|---------|--------|
| Stage 1 | Core identity (SOUL.md, USER.md) | Agent startup |
| Stage 2 | Episodic memory (project context) | On demand |
| Stage 3 | Semantic memory (related entities) | Context relevant |

### 3.4 Query Service

**Purpose**: Semantic search across memory.

**Features**:
- Vector embedding based search
- Cross-session relationship tracking
- Filters: time range, tags, entity types

---

## 4. Data Model

### 4.1 KG Schema

Based on existing `memory-optimization/ontology/memory-schema.yaml`:

```typescript
// Entity Types
type EntityType = 'Decision' | 'Finding' | 'LessonLearned' | 'Commitment' | 'ContextSnapshot'

// Relations
type RelationType =
  | 'led_to_decision'
  | 'decision_created'
  | 'fulfilled_by'
  | 'lesson_from'
  | 'related_to'
```

### 4.2 Storage Format

- Primary: JSONL files at `~/.xmo/kg/`
- Embeddings: `~/.xmo/embeddings/` (file-based cache)
- Lock: `~/.xmo/consolidation.lock`

---

## 5. MCP Tools Interface

All tools prefixed with `xmo_`:

| Tool | Description |
|------|-------------|
| `xmo_extract` | Manually trigger memory extraction |
| `xmo_consolidate` | Manually trigger dream consolidation |
| `xmo_query` | Semantic search across memory |
| `xmo_load` | Load memory into context |
| `xmo_stats` | View memory statistics |
| `xmo_get` | Get specific entity by ID |

---

## 6. Skill Commands

| Command | Description |
|---------|-------------|
| `/xmo` | Main command, show status overview |
| `/xmo-dream` | Manually trigger consolidation |
| `/xmo-stats` | View memory statistics |
| `/xmo-recover` | Proactive memory recovery |
| `/xmo-extract` | Manual extraction trigger |

---

## 7. Technical Stack

- **Runtime**: Bun + TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **Vector Search**: In-memory + file-based embedding cache
- **Storage**: JSONL (gitignored)

---

## 8. Project Structure

```
xmo/
├── packages/
│   ├── xmo-core/           # Shared library
│   │   ├── src/
│   │   │   ├── types/     # TypeScript types
│   │   │   ├── schema/     # KG schema definitions
│   │   │   └── utils/      # Shared utilities
│   │   └── package.json
│   ├── xmo-mcp/           # MCP Server
│   │   ├── src/
│   │   │   ├── tools/     # MCP tool implementations
│   │   │   ├── services/   # Extract, Consolidate, Loader, Query
│   │   │   └── index.ts   # Server entry point
│   │   └── package.json
│   └── xmo-skill/          # Skill Package
│       ├── src/
│       │   └── commands/   # /xmo, /dream, /stats, etc.
│       └── package.json
├── README.md
└── package.json            # Workspace root
```

---

## 9. Implementation Phases

### Phase 1: Core Structure
- [ ] Set up monorepo with pnpm workspaces
- [ ] Implement xmo-core types and schema
- [ ] Basic MCP server skeleton

### Phase 2: Extract & Query
- [ ] Extract Service implementation
- [ ] Query Service with basic search
- [ ] MCP tools: xmo_extract, xmo_query

### Phase 3: Consolidate (Dream)
- [ ] Consolidate Service with triple-gate
- [ ] DreamTask tracking
- [ ] Lock mechanism
- [ ] MCP tool: xmo_consolidate

### Phase 4: Loader
- [ ] Loader Service with 3 stages
- [ ] MCP tool: xmo_load

### Phase 5: Skill Integration
- [ ] xmo-skill commands
- [ ] Integration with Claude Code

### Phase 6: Polish
- [ ] Stats dashboard
- [ ] Error handling
- [ ] Documentation

---

## 10. Success Criteria

1. **Memory Extraction**: Key entities extracted from conversations automatically
2. **Consolidation**: Dream runs on schedule with progress visible to user
3. **Recovery**: Context loads relevant memory within 30 seconds
4. **Query**: Semantic search returns relevant results
5. **Integration**: Seamless with Claude Code via Skill + MCP

---

## 11. Reference

- Kairos (Claude Code leaked source): `src/services/autoDream/`, `src/services/extractMemories/`
- memory-optimization: `memory-optimization/ontology/memory-schema.yaml`
