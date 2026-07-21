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

## Set or replace a summary

```bash
lingo note summary set <note-id> --data '{
  "content": "Required non-empty summary"
}'
```

Running the command again replaces the note's current summary.
The summary content supports Markdown and is rendered as formatted content in note detail views.

## Add a subjective question

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
