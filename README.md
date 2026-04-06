# XMO - Extended Memory Optimization

A complete memory management system for Claude Code, Codex, and OpenClaw, inspired by Kairos architecture patterns.

## Features

- **Automatic Extraction**: Extract key decisions, findings, and lessons from conversations
- **Multi-Agent Session Auto-Extraction**: Automatically extract entities from Claude Code, Codex, and OpenClaw session history
- **Dream Consolidation**: Background memory consolidation with triple-gate mechanism
- **Proactive Loading**: Staged memory recovery at startup
- **Semantic Query**: Search memory using keyword-based grep search
- **Cross-Platform Sharing**: Memory shared between Claude Code, Codex, and OpenClaw

## Session Sources

XMO extracts entities from session transcripts using swappable adapters:

| Source | Location | Adapter |
|--------|----------|---------|
| Claude Code | `~/.claude/projects/<encoded-path>/<session-uuid>.jsonl` | Built-in |
| Codex | `~/.codex/sessions/**/*.jsonl` | Built-in |
| OpenClaw | `~/.openclaw/agents/*/sessions/*.jsonl` | Built-in |

Both adapters implement the `ToolAdapter` interface for unified entity extraction.

### Multi-Agent Session Auto-Extraction

XMO can automatically extract entities from supported session history:

- **Full Extraction**: Extract entities from Claude Code, Codex, and OpenClaw sessions on demand
- **Cron Scheduling**: Hourly automatic extraction via cron job
- **Duplicate Avoidance**: Tracks last extraction time to avoid re-processing

#### Setup Cron Job

```bash
# Add to crontab (runs every hour at minute 0)
0 * * * * /usr/local/bin/node /Users/richard/Documents/52VisionWorld/projects/xmo/scripts/xmo-cron-extract.mjs >> ~/.xmo/cron.log 2>&1
```

#### Manual Extraction

```bash
# Run full extraction from all adapters
node scripts/xmo-cron-extract.mjs

# Extract from one adapter
node scripts/xmo-cron-extract.mjs codex

# Or via MCP tool: xmo_extract_sessions
```

## Architecture

XMO is a monorepo with three packages:

- **xmo-core**: Shared types, schema, and utilities
- **xmo-mcp**: MCP Server providing memory operation tools
- **xmo-skill**: Skill package for user interaction commands

```
Claude Code       Codex       OpenClaw
    │              │             │
    ▼              ▼             ▼
/xmo-extract    AGENTS.md     xmo-mcp (via MCP stdio)
        \          │          /
         └────► @xmo/core ◄──┘
                    │
                    ▼
             ~/.xmo/kg/entities.jsonl
```

## Installation

```bash
cd /Users/richard/Documents/52VisionWorld/projects/xmo
pnpm install
pnpm build
```

## Agent Usage

After installation, Claude Code can use:

```bash
/xmo            # Show status overview
/xmo-extract    # Extract entities from the newest supported session
/xmo-query      # Search memory
/xmo-dream      # Trigger consolidation
/xmo-stats      # View statistics
/xmo-recover    # Load relevant memories (default 20 records)
/xmo Load 50   # Load 50 records
/xmo load all   # Load all matching records
/xmo extract codex  # Extract from Codex session history
```

Codex reads repository guidance from `AGENTS.md`. Keep that file aligned with `SKILL.md` so Codex queries XMO before historical or architectural work and saves durable decisions back to the shared KG.

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
- **Purpose**: Long-term memory shared between Claude Code, Codex, and OpenClaw
- **MCP Tools**: xmo_query, xmo_extract, xmo_consolidate, xmo_stats
- **When to use**: When answering questions about project history, decisions, or technical details, use `xmo_query` to search relevant memories
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `xmo_extract` | Extract key information to memory |
| `xmo_extract_sessions` | Extract entities from Claude Code, Codex, and OpenClaw session history |
| `xmo_query` | Search memory using keywords |
| `xmo_consolidate` | Trigger memory consolidation |
| `xmo_load` | Load memory into context |
| `xmo_stats` | View memory statistics |

## Data Storage

- **Location**: `~/.xmo/kg/entities.jsonl`
- **Lock**: `~/.xmo/dream.lock`
- **Cron Log**: `~/.xmo/cron.log`
- **Format**: JSONL (one entity per line)

## Project Structure

```
xmo/
├── packages/
│   ├── xmo-core/           # Shared library
│   │   └── src/adapters/   # Session adapters (Claude Code, Codex, OpenClaw)
│   ├── xmo-mcp/            # MCP Server
│   │   └── src/tools/      # MCP tools
│   └── xmo-skill/          # Skill Package
├── scripts/
│   └── xmo-cron-extract.mjs  # Cron extraction script
└── README.md
```

## Testing

```bash
pnpm test        # Run all tests
pnpm build       # Build all packages
```

## Design

See [docs/superpowers/specs/2026-04-02-xmo-design.md](docs/superpowers/specs/2026-04-02-xmo-design.md) for detailed architecture.
