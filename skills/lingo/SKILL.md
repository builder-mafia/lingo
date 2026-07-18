---
name: lingo
description: Save learned material as local Lingo notes, summaries, and active-learning questions, then evaluate pending answers with the current AI agent. Use when a user asks to remember or save what they learned, deepen an existing Lingo note, create practice questions, open the local learning workspace, review pending answers, or write honest feedback through the lingo CLI.
---

# Lingo

Use the `lingo` CLI as the interface between the current AI agent and the user's local learning workspace. Keep provider-specific reasoning in the active agent and persist only notes, questions, answers, and feedback through Lingo.

## Before starting

1. Verify that `lingo` is available with `lingo --version`.
2. If it is missing, stop and give the user the official installation command from the project README. Do not silently install software.
3. Read [references/cli.md](references/cli.md) before constructing payloads or handling CLI errors.
4. Use only the CLI. Do not read or modify `~/.lingo/lingo.sqlite` directly.

## Choose the workflow

- **Save new learning:** Create a note, set its summary, and add questions.
- **Deepen known learning:** Reuse a note ID supplied by the user or returned earlier, then update its summary or add questions.
- **Open practice:** Ensure the localhost server is running and return the note URL.
- **Evaluate answers:** List pending answers for a note, assess each one, and store one feedback result per question.

Do not invent an existing note ID. If the user refers to an old note but provides neither its ID nor URL, ask for one or direct them to the browser workspace.

## Save new learning

### 1. Distill the material

Identify one cohesive topic. Write:

- a concrete title that names the concept or decision;
- zero to three reusable labels;
- a concise summary of the current understanding;
- two to five questions unless the user explicitly asks for a note without practice.

Prefer questions that require the user to explain the idea in their own words or apply it to a new situation. Avoid generic prompts such as “Do you understand this?” or trivia that does not reveal understanding.

### 2. Create the note

```bash
lingo note create --data '{"title":"Cache invalidation","labels":["Backend","Architecture"]}'
```

Require an `ok: true` response. Capture `data.noteId` for subsequent commands and `data.noteUrl` for the user.

### 3. Set the summary

```bash
lingo note summary set <note-id> --data '{"content":"Keeping cached values consistent with their source requires an explicit refresh or invalidation policy."}'
```

Describe the learned model, not the conversation that produced it. Update the summary when new learning materially changes the model.

### 4. Add questions

Default to subjective questions because they expose whether the user can explain or apply the idea.

```bash
lingo question add <note-id> --data '{"question":"Why can time-based cache expiration still return stale data?","referenceAnswer":"The source may change before the expiration window ends, so the cache remains valid by time while already outdated relative to the source."}'
```

Use multiple choice only when distinguishing plausible alternatives is itself useful. Make every distractor plausible and explain why it is right or wrong.

Treat `referenceAnswer` as an evaluation rubric. Keep it accurate, self-contained, and hidden from any response that is meant to test the user.

### 5. Return a useful result

Report what was saved and return `data.noteUrl`. Do not dump raw JSON unless the user asks for it. Never claim that data was saved if any required command failed.

## Open the browser workspace

`lingo start` is a long-running process. Before starting another server, check whether `http://127.0.0.1:4312/health` already responds successfully.

When no server is running, launch `lingo start` in a persistent terminal or background session, wait for its success JSON, and keep the process alive. Then return the note URL or server URL. Do not expose the server beyond localhost.

## Evaluate pending answers

### 1. Read pending work

```bash
lingo answer list <note-id>
```

The response contains subjective answers that do not yet have feedback. If `data` is empty, tell the user there is nothing pending.

### 2. Evaluate with the current agent

Compare each answer with the question and `referenceAnswer`. Write concise, specific feedback that:

- identifies what the answer gets right;
- names the most important missing or confused point;
- suggests one concrete way to improve or test the explanation.

Be honest without being punitive. Do not replace the user's answer, invent evidence, or assign a numerical score unless the user explicitly requests one.

### 3. Store one feedback result per question

```bash
lingo evaluation set <question-id> --data '{"feedback":"You correctly identified the stale-data window. Also explain how invalidation triggered by a source update changes that window."}'
```

Store feedback only after completing the evaluation. Continue independently for the remaining questions, and report any failed question IDs.

## Handle generated text safely

- Pass exactly one of `--data` or `--data-file`.
- Prefer `--data-file` for long text, quotes, newlines, or user-provided content.
- Serialize JSON with a real JSON encoder when available; never interpolate unescaped user text into a shell command.
- Parse the command's JSON response and check its exit status.
- Preserve the user's wording in answers. Do not write an answer on their behalf unless they explicitly ask.

## Keep the product boundary

- Let the active AI agent summarize and evaluate; Lingo only stores and presents the result.
- Keep all data local unless the user explicitly authorizes sending it elsewhere.
- Deepen an existing note when its ID is known instead of creating a duplicate topic.
- Favor durable understanding over completion streaks, points, or gamified feedback.
