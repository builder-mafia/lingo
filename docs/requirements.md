# Lingo requirements and direction

## Purpose

Lingo is a local-first system for generating and answering questions from learning notes.

A **note** is a unit containing durable content and questions. A skill creates and enriches a note through the `lingo` CLI, then gives the user a localhost browser URL for solving it.

## Intended flow

```text
Skill → lingo CLI → local database → localhost browser URL
User → browser GUI → local database
Skill → lingo CLI reads note answers → AI evaluates → lingo CLI stores evaluation
Browser GUI → displays stored evaluation
```

The local browser/database app must not need to know which AI agent the user uses. Codex, Claude Code, Cursor, Hermes, and local models remain concerns of the calling skill.

## CLI taxonomy

Use the resource first, then the minimum action and identifier needed:

- `lingo --help` or `lingo -h`
- `lingo --version`
- `lingo --update`
- `lingo start`
- `lingo note create --data <json>`
- `lingo note content set <note-id>`
- `lingo note content get <note-id>`
- `lingo question add <note-id>`
- `lingo answer set <question-id>`
- `lingo answer list <note-id>`
- `lingo evaluation set <question-id>`

Do not put a temporary storage state in a command name or mandatory flag. A state filter is added only once multiple meaningful states exist.

Global flags are standalone root operations. They cannot be combined with one another or appended to a resource command. `--help` is concise human-readable English; all other success and error responses remain JSON.

## Core CLI operations

1. Start the browser server: `lingo start` binds only to `127.0.0.1:4312`, reports its URL as JSON, exposes `GET /health`, and keeps running until stopped.
2. Create a note: `lingo note create --data <json>` stores a required non-empty `title` and optional `labels`, then returns that metadata with `noteId`, `createdAt`, and a localhost note URL. Label whitespace and duplicates are removed while preserving the first-seen order.
3. Set note content: `lingo note content set <note-id> --data <json>` stores or replaces the note's Markdown body.
4. Read note content: `lingo note content get <note-id>` returns the current body before it is deepened or reorganized.
5. Add a question: `lingo question add <note-id> --data <json>` infers a multiple-choice or subjective contract from the JSON shape.
6. Set an answer: `lingo answer set <question-id> --data <json>` stores or updates an answer for a subjective question.
7. Read answers needing evaluation: `lingo answer list <note-id>` returns unanswered evaluations with question context.
8. Store an evaluation: `lingo evaluation set <question-id> --data <json>` stores or updates external AI feedback.

## Standalone self-update

`lingo --update` updates an installed standalone executable to the latest stable release from `builder-mafia/lingo` without confirmation. Source runs and future package-manager installations must direct users to their installation method instead of replacing another executable.

- Support macOS and Linux on arm64 and x64.
- Never install a prerelease or downgrade a newer local version.
- Reject symbolic links and paths that are not writable; never invoke `sudo`.
- Use an exclusive lock to prevent concurrent updates.
- Require the matching release archive and `SHA256SUMS` from the expected GitHub Release URL.
- Verify the SHA-256 digest and the staged executable's JSON `--version` response before replacement.
- Stage beside the installed executable and use a same-filesystem atomic rename so any failure preserves the previous binary.
- Return only the final JSON result on stdout. Update failures use the coarse message `Could not update Lingo.` and expose the stage, request URL/status/body, cause, and stack in `error.details` when available.

Structured CLI payloads must accept either:

- `--data <JSON string>`
- `--data-file <JSON file path>`

They must never accept both flags at once.

## Question schemas

### Multiple choice

A multiple-choice question contains:

- `question`
- `choices`: objects with `order`, `option`, and `explanation`
- `correctId`: the `order` of the correct choice

`explanation` says why a correct option is correct or why an incorrect option is incorrect. `correctId` must reference a real choice order.

### Subjective

A subjective question stays independent from the multiple-choice schema. It contains question text and a reference answer used by the external evaluator.

## Architecture decisions

- Runtime: Bun + TypeScript
- Effects and I/O composition: Effect
- Domain validation: Zod, centralized in `src/schemas/`
- Persistence: local SQLite
- SQLite schema evolution: ordered transactional migrations tracked with `PRAGMA user_version`
- User interface: browser GUI served only on localhost
- Common Effect capabilities: focused services and Live Layers in `src/layers/`, composed once by `AppRuntime` in `src/runtime.ts`
- Error policy: coarse-grained application/CLI errors with readable messages and optional details; avoid excessive error subclasses.
## Quality and maintenance

- Follow SOLID and single-responsibility boundaries.
- Test behavior before implementation changes.
- Keep technical decisions in this document and executable agent guidance in `AGENTS.md`.
- The current GitHub repository is private: https://github.com/gaki2/lingo
- Current initial PR: https://github.com/gaki2/lingo/pull/1
