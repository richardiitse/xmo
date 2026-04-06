---
name: xmo
description: Shared memory skill for Claude Code, Codex, and OpenClaw. Use when you need to extract decisions/findings from a session, query project memory, consolidate memory, inspect stats, or recover relevant context from `~/.xmo/kg/entities.jsonl`.
---

# XMO

XMO is a shared memory layer for three coding agents:

- Claude Code: slash commands and transcript extraction
- Codex: repository instructions plus Codex session extraction
- OpenClaw: MCP tools plus `MEMORY.md`

All three read and write the same knowledge graph at `~/.xmo/kg/entities.jsonl`.

## When To Use

Use XMO when you need to:

- recall project history, prior decisions, or technical context
- save important findings from the current session
- recover relevant memory before a large change
- consolidate noisy or duplicate memory

## Core Commands

### Claude Code

```bash
/xmo
/xmo-extract
/xmo query architecture decision
/xmo extract codex
/xmo-recover
/xmo-dream
/xmo-stats
```

`/xmo-extract` now auto-detects the newest supported session and can target `claude-code`, `codex`, or `openclaw`.

### OpenClaw / MCP

Available MCP tools:

- `xmo_query`
- `xmo_extract`
- `xmo_extract_sessions`
- `xmo_consolidate`
- `xmo_load`
- `xmo_stats`

Use `xmo_extract_sessions` with `adapter: "all" | "claude-code" | "codex" | "openclaw"` for batch ingestion.

## Session Sources

Built-in adapters:

- Claude Code: `~/.claude/sessions/*/transcript.json`
- Codex: `~/.codex/sessions/**/*.jsonl`
- OpenClaw: `~/.openclaw/agents/*/sessions/*.jsonl`

## Agent Bootstrap Files

Keep the repository-level instructions aligned:

- `CLAUDE.md`: Claude Code guidance
- `AGENTS.md`: Codex guidance
- `MEMORY.md`: OpenClaw guidance

These files should all point agents to the same XMO store and the same query/extract workflow.

## Operational Notes

- Shared KG: `~/.xmo/kg/entities.jsonl`
- Lock file: `~/.xmo/dream.lock`
- Cron script: `pnpm xmo:cron`
- Build before using MCP server: `pnpm build`

For broader architecture and installation details, see `README.md` and `README_CN.md`.
