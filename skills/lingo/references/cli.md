# Lingo CLI Reference

Read this reference before invoking Lingo. Commands accept structured JSON and return machine-readable JSON.

## Response contract

- Success: print `{"ok":true,"data":...}` to stdout and exit with status `0`.
- Failure: print a JSON error to stderr and exit with a non-zero status.
- Structured input: pass exactly one of `--data <json>` or `--data-file <path>`.
- IDs: use the UUID returned by Lingo. Do not synthesize one.

## Verify the installation

```bash
lingo --version
```

## Start the local workspace

```bash
lingo start
```

The process prints `data.serverUrl` and remains alive while serving the browser UI. The default URL is `http://127.0.0.1:4312`.

## Create a note

```bash
lingo note create --data '{
  "title": "Required non-empty title",
  "labels": ["Optional", "Labels"]
}'
```

`labels` defaults to an empty array. Lingo trims label whitespace and removes duplicates. Capture `data.noteId` and `data.noteUrl` from the response.

## Create a course

```bash
lingo course create --data '{
  "title": "Effect 핵심 이해하기",
  "goal": "동기·비동기 Effect와 오류 모델을 설명하고 적용한다.",
  "chapters": [
    {
      "title": "동기 Effect",
      "objective": "Effect.succeed, Effect.fail, Effect.sync의 실행 모델을 구분한다.",
      "labels": ["Effect", "Basics"]
    },
    {
      "title": "비동기 Effect",
      "objective": "비동기 작업의 성공, 실패, 취소 흐름을 설명한다.",
      "labels": ["Effect", "Async"]
    }
  ]
}'
```

Provide at least two chapters. Array order becomes chapter order; do not add `position` or content to chapter input. Lingo creates the course, chapter notes, labels, and relationships atomically. Capture `data.courseUrl` and every `data.chapters[].noteId`, then populate each note with `note content set` and `question add`.

## Set or replace note content

```bash
lingo note content set <note-id> --data '{
  "content": "Required non-empty Markdown content"
}'
```

Running the command again replaces the note's complete current content.
Note content supports Markdown and is rendered as formatted content in note detail views.

## Read note content

```bash
lingo note content get <note-id>
```

Use this before deepening an existing note. The command returns `noteId`, `content`, and `updatedAt`.

## Set or clear a note memo

```bash
lingo note memo set <note-id> --data '{
  "content": "Freeform user-owned scratch text"
}'
```

Running the command again replaces the current memo while keeping its identity. An empty or whitespace-only `content` value clears the memo. Preserve the user's spacing and wording unless they ask for editing.

## Read a note memo

```bash
lingo note memo get <note-id>
```

## Connect two notes

```bash
lingo relation add <note-id> --data '{
  "targetNoteId": "<target-note-id>"
}'
```

The connection is undirected and idempotent. Both notes must exist outside the trash. Do not create relations from shared labels or inferred similarity.

## List a note's relations

```bash
lingo relation list <note-id>
```

Each item contains the relation ID and the connected note's title and labels. Relations to trashed notes stay stored but are hidden until the note is restored.

## Remove a relation

```bash
lingo relation remove <relation-id>
```

## Add a note source

Store a source only after consulting it. `description` is optional, but when present it should state what the document established for this note rather than repeat generic page metadata.

```bash
lingo note source add <note-id> --data '{
  "title": "Effect error management",
  "url": "https://effect.website/docs/error-management/",
  "description": "Error handling contracts checked for this note."
}'
```

The URL must use HTTP or HTTPS. Adding the same URL to the same note updates its title and description while preserving its source ID and position.

## List note sources

```bash
lingo note source list <note-id>
```

The response contains sources in display order with `id`, `title`, `url`, nullable `description`, and `position`.

## Remove a note source

```bash
lingo note source remove <source-id>
```

The command returns `noteId` and a nullable `memo`. A missing memo is a successful response with `memo: null`, not an error.

## Add a subjective question

Question text is plain text, not Markdown. Do not put Markdown formatting in `question` or multiple-choice `choices[].option` values.

```bash
lingo question add <note-id> --data '{
  "question": "Required non-empty question",
  "referenceAnswer": "Required non-empty evaluation reference"
}'
```

Capture `data.questionId` from the response.

## Add a multiple-choice question

```bash
lingo question add <note-id> --data '{
  "question": "Required non-empty question",
  "choices": [
    {
      "order": 1,
      "option": "First option",
      "explanation": "Why it is right or wrong"
    },
    {
      "order": 2,
      "option": "Second option",
      "explanation": "Why it is right or wrong"
    }
  ],
  "correctId": 1
}'
```

Requirements:

- Provide at least two choices.
- Use unique positive integers for `choices[].order`.
- Set `correctId` to one of those order values.

## Store or replace a subjective answer

The browser normally performs this step. Use the CLI only when the user explicitly asks the agent to save an answer.

```bash
lingo answer set <question-id> --data '{
  "content": "Required non-empty user answer"
}'
```

Running the command again replaces the existing answer for the question.

## List answers awaiting evaluation

```bash
lingo answer list <note-id>
```

`data` is an array containing `questionId`, `question`, `referenceAnswer`, and `answer` for subjective answers without feedback. A question disappears from this list after feedback is stored.

## Store or replace evaluation feedback

```bash
lingo evaluation set <question-id> --data '{
  "feedback": "Required non-empty feedback"
}'
```

The question must already have a subjective answer. Running the command again replaces its feedback.

## Use a JSON file

Prefer a file when generated or user-provided text contains shell-sensitive characters.

```json
{
  "question": "How would this concept change under a new constraint?",
  "referenceAnswer": "A concise rubric for evaluating the user's explanation."
}
```

```bash
lingo question add <note-id> --data-file <path-to-json>
```

Delete temporary input files after the command finishes.
