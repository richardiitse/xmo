# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` workspace with three packages under `packages/`:

- `packages/xmo-core`: shared types, schema, adapters, services, and utilities.
- `packages/xmo-mcp`: MCP server and tool handlers in `src/tools/` and `src/services/`.
- `packages/xmo-skill`: slash-command style user commands in `src/commands/`.

Top-level automation lives in `scripts/`, notably `scripts/xmo-cron-extract.mjs`. Build output is generated in `dist/`; coverage reports are generated in `coverage/`. Do not hand-edit generated files.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies.
- `pnpm build`: build all packages with `tsc`.
- `pnpm test`: run all Vitest suites across the workspace.
- `pnpm --filter @xmo/mcp dev`: run the MCP server in watch mode with `tsx`.
- `pnpm xmo:cron`: run the session extraction script manually.

Use package-scoped commands when changing one package, for example `pnpm --filter @xmo/core test`.

## Coding Style & Naming Conventions
The codebase is TypeScript ESM targeting ES2022 with `strict` mode enabled. Follow the existing style:

- 2-space indentation.
- Single quotes and semicolons.
- `PascalCase` for adapters and exported types/classes, for example `OpenClawAdapter.ts`.
- `camelCase` for functions and service modules, for example `sessionExtraction.ts`.
- Keep public exports centralized through each package’s `src/index.ts` when appropriate.

## Testing Guidelines
Vitest is the test runner. Place tests beside source files using the `src/**/*.test.ts` pattern, such as `src/services/consolidate.test.ts`. Coverage uses the V8 provider and includes `src/**/*.ts` except declaration files. Add or update tests for any change to extraction, query, consolidation, locking, or adapter behavior.

## Agent-Specific Instructions
Codex should use XMO as shared project memory. Query existing context before historical or architectural work, and extract durable decisions with the XMO MCP tools or `pnpm xmo:cron`; shared storage is `~/.xmo/kg/entities.jsonl`.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commits with optional scopes, for example `feat(xmo-skill): add configurable limit to /xmo-recover` and `fix: address pre-landing review findings`. Keep commits focused and use `feat`, `fix`, `docs`, `test`, or `chore` as appropriate.

Pull requests should describe package impact, list validation commands run, and note any user-facing command or MCP tool changes. When behavior changes, update `README.md` and `README_CN.md` in the same PR.
