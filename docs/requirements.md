# Lingo requirements and direction

## Purpose

Lingo is a local-first system for generating and answering questions from learning notes.

A **note** is a unit containing a summary and questions. A skill creates and enriches a note through the `lingo` CLI, then gives the user a localhost browser URL for solving it.

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

- `lingo note create --data <json>`
- `lingo note summary set <note-id>`
- `lingo question add <note-id>`
- `lingo answer set <question-id>`
- `lingo answer list <note-id>`
- `lingo evaluation set <question-id>`

Do not put a temporary storage state in a command name or mandatory flag. A state filter is added only once multiple meaningful states exist.

## Core CLI operations

1. Create a note: `lingo note create --data <json>` stores a required non-empty `title` and optional `labels`, then returns that metadata with `noteId`, `createdAt`, and a localhost note URL. Label whitespace and duplicates are removed while preserving the first-seen order.
2. Set a note summary: `lingo note summary set <note-id> --data <json>` stores or updates the note summary.
3. Add a question: `lingo question add <note-id> --data <json>` infers a multiple-choice or subjective contract from the JSON shape.
4. Set an answer: `lingo answer set <question-id> --data <json>` stores or updates an answer for a subjective question.
5. Read answers needing evaluation: `lingo answer list <note-id>` returns unanswered evaluations with question context.
6. Store an evaluation: `lingo evaluation set <question-id> --data <json>` stores or updates external AI feedback.

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
