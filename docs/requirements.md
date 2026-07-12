# Lingo requirements and direction

## Purpose

Lingo is a local-first system for generating and solving learning/problem notes.

A **note** is a unit containing a summary and problems. A skill creates and enriches a note through the `lingo` CLI, then gives the user a localhost browser URL for solving it.

## Intended flow

```text
Skill → lingo CLI → local database → localhost browser URL
User → browser GUI → local database
Skill → lingo CLI reads note answers → AI evaluates → lingo CLI stores evaluation
Browser GUI → displays stored evaluation
```

The local browser/database app must not need to know which AI agent the user uses. Codex, Claude Code, Cursor, Hermes, and local models remain concerns of the calling skill.

## Core CLI operations

1. Create an empty note: `lingo note create` returns `noteId`, `createdAt`, and a localhost note URL after storing it in SQLite.
2. Set a note summary: `lingo note summary set <note-id> --data <json>` stores or updates the note summary.
3. Add a multiple-choice problem to a note.
4. Add a subjective problem to a note.
5. Read unanswered or unevaluated subjective answers for a note.
6. Store a subjective-answer evaluation.

Structured CLI payloads must accept either:

- `--data <JSON string>`
- `--data-file <JSON file path>`

They must never accept both flags at once.

## Problem schemas

### Multiple choice

A multiple-choice problem contains:

- `question`
- `choices`: objects with `order`, `option`, and `explanation`
- `correctId`: the `order` of the correct choice

`explanation` says why a correct option is correct or why an incorrect option is incorrect. `correctId` must reference a real choice order.

### Subjective

A subjective problem stays independent from the multiple-choice schema. It needs a prompt and AI-evaluation criteria/rubric. Example answers may be optional.

## Architecture decisions

- Runtime: Bun + TypeScript
- Effects and I/O composition: Effect
- Domain validation: Zod, centralized in `src/schemas/`
- Persistence: local SQLite
- User interface: browser GUI served only on localhost
- Common Effect capabilities: focused services and Live Layers in `src/layers/`, composed once by `AppRuntime` in `src/runtime.ts`
- Error policy: coarse-grained application/CLI errors with readable messages and optional details; avoid excessive error subclasses.
## Quality and maintenance

- Follow SOLID and single-responsibility boundaries.
- Test behavior before implementation changes.
- Keep technical decisions in this document and executable agent guidance in `AGENTS.md`.
- The current GitHub repository is private: https://github.com/gaki2/lingo
- Current initial PR: https://github.com/gaki2/lingo/pull/1
