# Lingo requirements and direction

## Purpose

Lingo is a local-first system for generating and answering questions from learning notes.

A **note** is a unit containing durable content and questions. A **course** is a learning goal and an ordered set of chapters, where each chapter is exactly one note. A skill creates and enriches these units through the `lingo` CLI, then gives the user a localhost browser URL for learning.

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
- `lingo course create --data <json>`
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
2. Create a course: `lingo course create --data <json>` atomically creates a learning goal and at least two ordered chapter notes. It returns a course URL and every chapter note ID; chapter content and questions continue to use the existing note commands.
3. Create a note: `lingo note create --data <json>` stores a required non-empty `title` and optional `labels`, then returns that metadata with `noteId`, `createdAt`, and a localhost note URL. Label whitespace and duplicates are removed while preserving the first-seen order.
4. Set note content: `lingo note content set <note-id> --data <json>` stores or replaces the note's Markdown body.
5. Read note content: `lingo note content get <note-id>` returns the current body before it is deepened or reorganized.
6. Add a question: `lingo question add <note-id> --data <json>` infers a multiple-choice or subjective contract from the JSON shape. Question prompts and multiple-choice options are plain text, not Markdown.
7. Set an answer: `lingo answer set <question-id> --data <json>` stores or updates an answer for a subjective question.
8. Read answers needing evaluation: `lingo answer list <note-id>` returns unanswered evaluations with question context.
9. Store an evaluation: `lingo evaluation set <question-id> --data <json>` stores or updates external AI feedback.

## Course model

- A course owns `title`, actionable `goal`, workflow `status`, and ordered chapters.
- A chapter is one normal note plus a course-specific objective and position. It does not duplicate content, questions, answers, or evaluation storage.
- Creating a course, its chapter notes, labels, and memberships is one SQLite transaction.
- Answering the first question in any chapter may move a `not_started` course to `in_progress`. Only the user chooses `completed` or `deferred`.
- Chapter order is recommended, never locked. Completion is not a mastery score, and the UI does not use percentages, XP, streaks, or automatic proficiency claims.
- MVP intentionally excludes course editing, deletion, chapter insertion/reordering, and a separate lesson layer.

The browser workspace uses soft deletion for notes. Removing a note moves it to a local trash view without deleting its content, questions, answers, or feedback. The user can restore it or explicitly confirm permanent deletion; only permanent deletion removes the full note graph from SQLite.

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

After an answer is stored, the question session offers the next unanswered question from the same note. Advancing does not resolve the current question; resolution remains an explicit user decision.

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
