# Claude Code Instructions

Use XMO as the shared project memory layer.

- Before answering questions about project history, decisions, or prior technical context, query XMO with `/xmo-query <keywords>` or `/xmo recover`.
- After important implementation decisions, bug findings, or lessons learned, run `/xmo-extract` to save them.
- Use `/xmo extract claude-code`, `/xmo extract codex`, or `/xmo extract openclaw` when a specific agent transcript should be ingested.
- Use `/xmo-dream` to consolidate memory and `/xmo-stats` to inspect the KG.

The shared memory store is `~/.xmo/kg/entities.jsonl`. Keep it compatible with Codex and OpenClaw by using the XMO commands or MCP tools rather than editing JSONL manually.
