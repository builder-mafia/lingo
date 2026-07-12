# Lingo Agent Guide

## Product direction

Lingo is a local-first note and problem-solving app.

- A skill creates notes and problems through the `lingo` CLI, then returns a localhost browser URL.
- The browser UI stores answers in the local database.
- A skill later reads answers through the CLI, evaluates them with the active AI agent, and writes evaluation results back through the CLI.
- Keep the local app independent of a specific AI provider. The app does not invoke Codex, Claude, Cursor, or Ollama itself.

## Technology and architecture

- Use Bun, TypeScript, Effect, Zod, and SQLite.
- Zod schemas in `src/schemas/` are the single source of truth for domain input contracts. Derive TypeScript types from Zod; do not duplicate interfaces.
- Keep Zod schema files separate by domain type. Only share fields that are truly common.
- Use Effect for I/O, composition, and dependency boundaries.
- Put reusable Effect dependencies in `src/layers/` as focused services and Live Layers. Commands should depend on interfaces, not concrete I/O implementations.
- Prefer coarse-grained Effect errors (for example, a CLI/application error with a clear message and optional details). Do not create many tiny error variants unless callers genuinely need different recovery behavior.
- Apply SOLID and single-responsibility design. Separate schemas, input parsing, command orchestration, persistence, and presentation.

## CLI conventions

- The executable is `lingo`.
- Structured command input must support exactly one of `--data <json>` or `--data-file <path>`.
- CLI responses are JSON. Invalid input must produce a JSON error response and a non-zero exit code.
- Do not add a generic `--type` payload shape when separate commands and schemas make the type explicit.

## Quality bar

- Use TDD: write a failing behavior test before production behavior changes.
- Run `bun test` and `bun run typecheck` before committing.
- Keep README usage examples executable.
- Do not add secrets, API keys, remote user data, or provider-specific auth to the local app.
