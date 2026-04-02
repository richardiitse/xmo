# XMO - Extended Memory Optimization

A complete memory management system for Claude Code, inspired by Kairos architecture patterns.

## Features

- **Automatic Extraction**: Extract key decisions, findings, and lessons from conversations
- **Dream Consolidation**: Background memory consolidation with triple-gate mechanism
- **Proactive Loading**: Staged memory recovery at startup
- **Semantic Query**: Search memory using vector embeddings

## Architecture

XMO is a monorepo with three packages:

- **xmo-core**: Shared types, schema, and utilities
- **xmo-mcp**: MCP Server providing memory operation tools
- **xmo-skill**: Skill package for user interaction commands

## Installation

```bash
cd /Users/rongchuanxie/Documents/52VisionWorld/projects/52vw/xmo
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

## MCP Tools

| Tool | Description |
|------|-------------|
| `xmo_extract` | Extract key information to memory |
| `xmo_query` | Semantic search across memory |
| `xmo_consolidate` | Trigger memory consolidation |
| `xmo_load` | Load memory into context |
| `xmo_stats` | View memory statistics |

## Project Structure

```
xmo/
├── packages/
│   ├── xmo-core/           # Shared library
│   ├── xmo-mcp/           # MCP Server
│   └── xmo-skill/          # Skill Package
└── README.md
```

## Design

See docs/superpowers/specs/2026-04-02-xmo-design.md
