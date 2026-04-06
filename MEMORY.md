# OpenClaw Memory Instructions

Use XMO as the shared long-term memory for this repository.

- When a task depends on project history, past decisions, or technical rationale, call `xmo_query` before guessing.
- After important decisions, findings, or lessons, persist them with `xmo_extract`.
- Use `xmo_extract_sessions` to ingest historical transcripts from `claude-code`, `codex`, `openclaw`, or `all`.
- Use `xmo_consolidate` for cleanup and `xmo_stats` to inspect memory health.

Shared storage:

- Knowledge graph: `~/.xmo/kg/entities.jsonl`
- Lock file: `~/.xmo/dream.lock`

Do not hand-edit the JSONL store unless you are performing a controlled repair.
