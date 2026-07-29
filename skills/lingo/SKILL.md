---
name: lingo
description: Save learned material as durable local Lingo notes and active-learning questions, design systematic multi-chapter courses, and evaluate pending answers with the current AI agent. Use when a user asks to remember or organize what they learned, study a domain through an ordered curriculum, deepen an existing Lingo note, create practice questions, open the local learning workspace, review pending answers, or write honest feedback through the lingo CLI.
---

# Lingo

Use the `lingo` CLI between the active AI agent and the user's local learning workspace. Keep reasoning and research in the active agent. Persist courses, notes, questions, answers, and feedback through Lingo.

## Before starting

1. Verify `lingo` with `lingo --version`.
2. If it is missing, stop and give the user the official installation command from the project README. Do not silently install software.
3. Read [references/cli.md](references/cli.md) before constructing payloads or handling errors.
4. Use only the CLI. Do not read or modify `~/.lingo/lingo.sqlite` directly.

## Choose the workflow

- **Save new learning:** Create a note, write its content, and add questions.
- **Study a domain systematically:** Design an ordered course, then fill each chapter note with content and questions.
- **Deepen known learning:** Read existing content, combine it with the new understanding, and replace it with one coherent body.
- **Open practice:** Ensure the localhost server is running and return the note URL.
- **Evaluate answers:** List pending answers, assess each one, and store one feedback result per question.

Do not invent an existing note ID. If the user refers to an old note but provides neither its ID nor URL, ask for one or direct them to the browser workspace.

## Build durable note content

When the user gives no more specific writing direction, infer the user's current understanding from the conversation and create material that will help them reconstruct and extend it later.

Select only the structure useful to the topic. Include, when relevant:

- the mental model the user now understands;
- concrete principles, mechanisms, and background needed to support it;
- examples, code, or commands where exact application matters;
- distinctions, tradeoffs, and cautions that prevent likely confusion;
- gaps or unresolved points revealed by the conversation;
- enough context for the note to make sense without reopening the conversation.

Do not write a transcript, meeting notes, or commentary about “the user.” Do not force every note into the same template. Remove repetition, but do not shorten away details needed for later review. Follow the user's explicit scope, format, and level-of-detail instructions over these defaults.

Write the content as Markdown:

- Do not add a top-level heading; the note page already supplies the title and content heading.
- Use descriptive section headings only when they improve navigation.
- Use short paragraphs for mental models and lists for parallel facts, tradeoffs, or steps.
- Use bold text sparingly for terms worth recalling.
- Use inline or fenced code only when exact syntax matters.
- Avoid raw HTML, images, and decorative formatting.

Keep practice questions separate from the content. Content may name an unresolved point when that context matters, but do not duplicate the question bank inside the body.

## Preserve precise terminology

Preserve the original term when organizing material from a foreign-language source if translation would lose precision, change its scope, or make an established concept harder to recognize. Apply this to important technical keywords, coined concepts, API and specification terms, identifiers, and proper nouns.

- Add a brief Korean explanation on first use only when it improves understanding; do not replace the original term with an awkward or invented translation.
- Keep meaning-sensitive terminology consistent across content, questions, choices, and feedback.
- Translate the surrounding explanation for readability while leaving the precise term intact.
- Use a familiar standard Korean term when it carries the same meaning more clearly; preserving every foreign word is not the goal.

## Strengthen the content with sources

When related articles or documentation can materially improve accuracy, context, or persuasiveness, research them before writing. Prefer authoritative sources such as official documentation, standards, original research, and first-party technical articles. Use secondary sources only when they add a useful explanation or perspective.

- Search with public topic terms; do not include private user data in external queries.
- Use sources to verify and enrich the user's model, not to replace it with a link collection.
- Distinguish sourced facts from the agent's inference when the distinction matters.
- Cite only sources actually consulted and directly relevant to the saved content.
- Add a final `## Sources` section with descriptive Markdown links when sources were used. Omit the section when no external source was needed or available.
- Never invent a citation, title, author, or URL.

## Save new learning

### 1. Prepare the note

Choose one cohesive topic and prepare:

- a concrete title naming the concept or decision;
- zero to three reusable labels;
- the Markdown content;
- two to five questions unless the user explicitly asks for a note without practice.

Create a mixed practice set by default. When generating two or more questions, include at least one subjective question and at least one multiple-choice question. Deviate only when the user requests one format or the topic cannot support plausible choices without inventing misleading alternatives. If the user requests exactly one question, choose its format from the learning goal.

Use subjective questions to test recall, explanation in the user's own words, or application to a new situation. Use multiple-choice questions to test distinctions between similar concepts, decisions under a concrete scenario, or recognition of a likely misconception. Avoid generic checks such as “Do you understand this?” and trivia that does not expose understanding.

Write the `question` field as plain text. Do not use Markdown syntax such as headings, lists, emphasis, links, blockquotes, or inline and fenced code in question prompts. Write multiple-choice `option` values as plain text as well. Preserve exact technical terms without wrapping them in backticks.

### 2. Create the note

```bash
lingo note create --data '{"title":"Cache invalidation","labels":["Backend","Architecture"]}'
```

Require an `ok: true` response. Capture `data.noteId` for subsequent commands and `data.noteUrl` for the user.

### 3. Set the content

```bash
lingo note content set <note-id> --data '{"content":"A cache needs an explicit consistency policy.\n\n- **TTL** bounds how long stale data can remain.\n- **Invalidation** reacts to source changes."}'
```

Prefer `--data-file` for substantive Markdown so shell quoting cannot corrupt it. Describe the learned model rather than the conversation that produced it.

### 4. Add questions

For a subjective question, treat `referenceAnswer` as an evaluation rubric. Keep it accurate, self-contained, and hidden from any response meant to test the user.

```bash
lingo question add <note-id> --data '{"question":"Why can time-based cache expiration still return stale data?","referenceAnswer":"The source may change before the expiration window ends, so the cache remains valid by time while already outdated relative to the source."}'
```

For a multiple-choice question, provide three or four choices when the topic supports them. Give every choice a unique positive `order` and an `explanation` of why it is right or wrong, then set `correctId` to the correct order. Make each distractor reflect a plausible misconception or incomplete model. Keep choices similar in length and structure so wording does not reveal the answer.

```bash
lingo question add <note-id> --data '{"question":"Which situation can still expose stale cache data?","choices":[{"order":1,"option":"The source changes before the TTL expires","explanation":"The cached value remains valid by time even though the source has changed."},{"order":2,"option":"Every read bypasses the cache","explanation":"Bypassing the cache reads the source directly, so this is not stale cache data."},{"order":3,"option":"The cache entry is removed on every source update","explanation":"Successful invalidation removes the stale entry before the next read."}],"correctId":1}'
```

### 5. Return the result

Report what was saved and return `data.noteUrl`. Do not dump raw JSON unless asked. Never claim that data was saved if any required command failed.

## Deepen an existing note

Read the current body before writing:

```bash
lingo note content get <note-id>
```

Preserve still-valid knowledge, integrate the new material, resolve contradictions where evidence permits, and produce one coherent replacement. Then write the complete body with `lingo note content set`; do not blindly append fragments.

## Design a systematic course

Use a course when the user wants to build capability across a domain rather than save one cohesive topic. A course is an ordered set of chapters, and every chapter is a normal Lingo note with its own Markdown content and questions.

### 1. Define the learning path

Infer or establish:

- the user's current level, desired scope, and concrete learning outcome;
- the concepts that belong in or outside the course;
- the prerequisite order between chapters;
- one observable objective per chapter that says what the user should be able to explain, distinguish, or apply.

Research authoritative sources before fixing the curriculum when the domain has official documentation, standards, or primary references. Prefer a small coherent path over an exhaustive catalog. Use at least two chapters. Do not add a separate lesson layer, lock later chapters, or promise mastery from completion.

### 2. Create the course and chapter notes

```bash
lingo course create --data-file <course-json-path>
```

The payload contains `title`, an actionable `goal`, and ordered `chapters` with `title`, `objective`, and optional `labels`. Do not include content or questions in this payload.

Require `ok: true`. Capture `data.courseUrl`. Capture every chapter `noteId` from `data.chapters` before continuing.

### 3. Fill every chapter

For each returned chapter `noteId`, build durable Markdown content using the chapter objective and the same source, terminology, and writing rules used for a standalone note. Then call:

```bash
lingo note content set <note-id> (--data <json> | --data-file <path>)
lingo question add <note-id> (--data <json> | --data-file <path>)
```

Create two to five useful questions per chapter by default, including both subjective and multiple-choice formats when there are two or more questions. Test the chapter objective rather than trivia from the source.

### 4. Report partial failures honestly

Course creation and chapter filling are separate steps. If any content or question command fails, keep the successful course, report the failed chapter IDs and what remains incomplete, and never claim that the whole course is ready. Return `data.courseUrl` when creation succeeded.

## Open the browser workspace

`lingo start` is long-running. Before starting another server, check whether `http://127.0.0.1:4312/health` responds successfully.

When no server is running, launch `lingo start` in a persistent terminal or background session, wait for its success JSON, and keep it alive. Return the note URL or server URL. Do not expose the server beyond localhost.

## Evaluate pending answers

### 1. Read pending work

```bash
lingo answer list <note-id>
```

The response contains subjective answers without feedback. If `data` is empty, tell the user there is nothing pending.

### 2. Evaluate with the current agent

Compare each answer with the question and `referenceAnswer`. Write concise, specific feedback that:

- identifies what the answer gets right;
- names the most important missing or confused point;
- suggests one concrete way to improve or test the explanation.

Be honest without being punitive. Do not replace the user's answer, invent evidence, or assign a numerical score unless requested.

### 3. Store one feedback result per question

```bash
lingo evaluation set <question-id> --data '{"feedback":"You correctly identified the stale-data window. Also explain how invalidation triggered by a source update changes that window."}'
```

Store feedback only after evaluating the answer. Continue independently for the remaining questions, and report any failed question IDs.

## Handle generated text safely

- Pass exactly one of `--data` or `--data-file` to commands with structured input.
- Prefer `--data-file` for long text, quotes, newlines, or user-provided content.
- Serialize JSON with a real JSON encoder; never interpolate unescaped user text into a shell command.
- Parse the JSON response and check its exit status.
- Preserve the user's wording in answers. Do not write an answer on their behalf unless explicitly asked.

## Keep the product boundary

- Let the active AI agent organize, research, and evaluate; Lingo only stores and presents the result.
- Keep stored data local unless the user explicitly authorizes otherwise.
- Deepen an existing note when its ID is known instead of creating a duplicate topic.
- Favor durable understanding over completion streaks, points, or gamified feedback.
