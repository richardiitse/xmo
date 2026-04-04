# XMO - Extended Memory Optimization

A complete memory management system for Claude Code and OpenClaw, inspired by Kairos architecture patterns.

## Features

- **Automatic Extraction**: Extract key decisions, findings, and lessons from conversations
- **Dream Consolidation**: Background memory consolidation with triple-gate mechanism
- **Proactive Loading**: Staged memory recovery at startup
- **Semantic Query**: Search memory using keyword-based grep search
- **Cross-Platform Sharing**: Memory shared between Claude Code and OpenClaw

## Session Sources

XMO extracts entities from session transcripts using swappable adapters:

| Source | Location | Adapter |
|--------|----------|---------|
| Claude Code | `~/.claude/sessions/*/transcript.json` | Built-in |
| OpenClaw | `~/.openclaw/agents/*/sessions/*.jsonl` | Built-in |

Both adapters implement the `ToolAdapter` interface for unified entity extraction.

## Architecture

XMO is a monorepo with three packages:

- **xmo-core**: Shared types, schema, and utilities
- **xmo-mcp**: MCP Server providing memory operation tools
- **xmo-skill**: Skill package for user interaction commands

```
Claude Code                          OpenClaw
    │                                    │
    ▼                                    ▼
/xmo-extract ──────► @xmo/core ◄───── xmo-mcp (via MCP stdio)
                           │
                           ▼
                    ~/.xmo/kg/entities.jsonl  ◄── Shared Storage
```

## Installation

```bash
cd /Users/richard/Documents/52VisionWorld/projects/xmo
pnpm install
pnpm build
```

## Claude Code Skill

After installation, Claude Code can use:

```bash
/xmo-extract  # Extract entities from current session
/xmo-query    # Search memory
/xmo-dream    # Trigger consolidation
/xmo-stats     # View statistics
```

## OpenClaw Configuration

To enable OpenClaw to use XMO MCP tools:

```bash
# Add XMO MCP server to OpenClaw
openclaw mcp set xmo '{"command":"node","args":["/path/to/xmo/packages/xmo-mcp/dist/index.js"]}'

# Verify configuration
openclaw mcp list
```

### Making OpenClaw Agents Automatically Use XMO

After configuring the MCP server, update each agent's `MEMORY.md` to enable automatic memory search.

#### OpenClaw Workspaces

OpenClaw workspaces that need MEMORY.md with XMO configuration:

| Workspace | Path | Status |
|-----------|------|--------|
| main | `~/.openclaw/workspace/MEMORY.md` | Existing |
| altas | `~/.openclaw/workspace-altas/MEMORY.md` | Existing |
| scribe | `~/.openclaw/workspace-scribe/MEMORY.md` | Created |
| tutor | `~/.openclaw/workspace-tutor/MEMORY.md` | Created |
| aslan | `~/.openclaw/workspace-aslan/MEMORY.md` | Created |

#### MEMORY.md Template

Add this section to each workspace's MEMORY.md:

```markdown
## XMO Memory System (Cross-Platform Shared)

- **Location**: `~/.xmo/kg/entities.jsonl`
- **Purpose**: Long-term memory shared between Claude Code and OpenClaw
- **MCP Tools**: xmo_query, xmo_extract, xmo_consolidate, xmo_stats
- **When to use**: When answering questions about project history, decisions, or technical details, use `xmo_query` to search relevant memories
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `xmo_extract` | Extract key information to memory |
| `xmo_query` | Search memory using keywords |
| `xmo_consolidate` | Trigger memory consolidation |
| `xmo_load` | Load memory into context |
| `xmo_stats` | View memory statistics |

## Data Storage

- **Location**: `~/.xmo/kg/entities.jsonl`
- **Lock**: `~/.xmo/dream.lock`
- **Format**: JSONL (one entity per line)

## Project Structure

```
xmo/
├── packages/
│   ├── xmo-core/           # Shared library
│   ├── xmo-mcp/           # MCP Server
│   └── xmo-skill/         # Skill Package
└── README.md
```

## Design

See [docs/superpowers/specs/2026-04-02-xmo-design.md](docs/superpowers/specs/2026-04-02-xmo-design.md) for detailed architecture.
