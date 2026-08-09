# CLAUDE.md — Project Instructions for Claude Code

## Project Overview

Godot MCP Server — a Model Context Protocol server for the Godot game engine. Fork of Coding-Solo/godot-mcp with modular architecture, automated tests, and additional tools.

## Before Every Commit

**Always run the full CI validation before committing:**

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm build && pnpm test
```

If formatting fails, fix with `npx prettier --write .` and include in the commit.

Do not commit code that fails any of these checks. CI runs all five on every push.

## Key Commands

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `pnpm build`        | TypeScript compile + copy GDScript files to build/ |
| `pnpm test`         | Run all vitest tests (requires Godot installed)    |
| `pnpm lint`         | ESLint with strict TypeScript checking             |
| `pnpm format:check` | Prettier formatting check                          |
| `pnpm typecheck`    | `tsc --noEmit`                                     |

## Architecture

- `src/handlers/` — One file per domain (scene, node, process, etc.). All handlers: `async (ctx: ServerContext, args: any) => ToolResponse`
- `src/tool-router.ts` — Maps tool names to handler functions
- `src/tool-definitions.ts` — MCP tool schemas (JSON)
- `src/godot-executor.ts` — Spawns headless Godot with `execFileAsync` (no shell, args as array)
- `src/context.ts` — `ServerContext` class holding runtime state
- `src/utils.ts` — Shared utilities (normalizeParameters, validatePath, killProcess, etc.)
- `src/tcp-client.ts` — TCP connection to interactive Godot sessions
- `src/index.ts` — Entry point. MCP SDK v2 (`@modelcontextprotocol/server`), low-level `Server` API (not `McpServer`), served via `serveStdio()` — speaks stateless MCP `2026-07-28` to modern clients and falls back to the legacy `initialize` handshake for 2025-era clients

## Testing

- Tests live in `test/` — unit tests in `test/unit/`, integration in `test/integration/`, display in `test/display/`
- Integration tests call handlers directly against a real Godot engine + bundled fixture project at `test/fixture/`
- No mocking — full stack verification
- `test/setup.ts` creates `ServerContext` pointing to `src/scripts/godot_operations.gd` (no build step needed for tests)
- Tests run sequentially (Godot can't handle parallel headless instances on same project)

## Config Files

- `tsconfig.json` — Build config (src/ only, outputs to build/)
- `tsconfig.test.json` — Extended config including test files, used by ESLint
- `vitest.config.ts` — Test runner config (30s timeout, sequential)
- `eslint.config.mjs` — Uses both tsconfigs for type-aware linting

## Conventions

- Use `execFileAsync` (not `execAsync`) for Godot — avoids shell, fixes Windows JSON parsing
- Always `normalizeParameters(args)` at handler entry to support both camelCase and snake_case
- Always `validatePath()` user-provided paths before filesystem access
- Error responses use `createErrorResponse()` with helpful `possibleSolutions`
- Use `killProcess()` (awaits exit) instead of bare `.kill()` for process cleanup

## When Adding or Removing Tools

Every new tool must be reflected in **all** of:

1. **GDScript** (if TCP-based): Add command handler in `src/scripts/input_receiver.gd`
2. **Handler**: Add function in the appropriate `src/handlers/*.ts` file
3. **Tool definition**: Add schema in `src/tool-definitions.ts`
4. **Router**: Wire the handler in `src/tool-router.ts`
5. **Tests**: Add at least parameter validation tests in `test/integration/`
6. **README.md**: Update the tool count heading and the relevant tool table
7. **TODO.md**: Check off the item if it was planned

Do not commit a new tool without updating README and adding tests.
