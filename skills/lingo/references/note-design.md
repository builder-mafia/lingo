# Note Design Reference

Read this reference completely before creating or substantially deepening a Lingo note. Design the note for the learner's future reconstruction and use of an idea, not as a shorter transcript of the current conversation.

## Contents

- [Capture intent](#capture-intent)
- [Synthesis process](#synthesis-process)
- [Information architecture](#information-architecture)
- [Choose a useful note shape](#choose-a-useful-note-shape)
- [Evidence and uncertainty](#evidence-and-uncertainty)
- [Examples and exact material](#examples-and-exact-material)
- [Question alignment](#question-alignment)
- [Deepen without creating a junk drawer](#deepen-without-creating-a-junk-drawer)
- [Quality gate](#quality-gate)
- [Evidence basis](#evidence-basis)

## Capture intent

Treat the note as an answer to one future retrieval need. Infer these inputs from the conversation before writing:

1. **Retrieval need:** What future question, decision, explanation, or task should this note help reconstruct?
2. **Current model:** What does the learner already understand in their own words?
3. **Fragile points:** Which missing link, conflation, unsupported assumption, or boundary is most likely to cause false confidence later?
4. **Useful depth:** Does the learner need a mental model, an implementation reference, a decision record, a procedure, or a source synthesis?
5. **Scope boundary:** Which adjacent ideas are required for coherence, and which belong in another note?

Create a short internal **note brief** containing:

- the future retrieval need;
- one-sentence central model or claim;
- the learner's relevant starting point;
- required mechanisms, evidence, examples, and distinctions;
- explicit exclusions or unresolved points;
- the understanding each practice question should expose.

Do not show the note brief unless it helps resolve ambiguity. Notes are replaceable, so avoid a course-style intake interview. Ask at most one compact clarification when the topic boundary, intended use, or required depth would materially change the result. Otherwise state a reasonable assumption and create the note.

Use the conversation as evidence of understanding, not as the document structure. Never organize the note as “first we discussed,” “then the user asked,” or a speaker-by-speaker recap.

## Synthesis process

Build the note in this order:

1. Extract the claims, mechanisms, decisions, examples, and unresolved questions from the conversation or source.
2. Separate directly supported facts from the learner's hypothesis and the agent's inference.
3. Verify version-sensitive, consequential, or uncertain claims with authoritative sources when available.
4. Write the central mental model in plain language before adding details.
5. Reorganize details by causal or decision structure rather than source order.
6. Add only the background needed to make the model independently understandable.
7. Add a concrete example, contrast, boundary, or failure mode that tests the model.
8. Remove repetition, conversational filler, and facts that do not serve the retrieval need.
9. Derive questions from the model and its fragile points.
10. Run the quality gate before and after saving.

Compress wording, not reasoning. Preserve causal chains, prerequisites, tradeoffs, constraints, decision criteria, and the reason an example works. A shorter note that removes these relationships creates recognition without understanding.

Prefer synthesis over aggregation. Do not paste multiple source summaries one after another. Reconcile them into one model, note meaningful disagreements, and preserve source-specific limits.

## Information architecture

Make the title a **future retrieval cue**. Name the concept, problem, mechanism, or decision a learner is likely to search for. Avoid titles such as “정리,” “기타,” “공부 내용,” a raw URL, or a date without a meaningful subject.

Keep one cohesive retrieval need per note. Split material when sections answer independent future questions, require different prerequisites, or would be useful in different contexts. Keep related material together when separating it would break the causal explanation.

Open with the core model or practical conclusion. Do not make the reader traverse historical context or definitions before discovering why the note matters.

Use headings to expose the logic of the topic, not to satisfy a fixed template. Prefer headings such as:

- why the mechanism exists;
- how the parts interact;
- where two concepts differ;
- when a choice is appropriate;
- what breaks at the boundary;
- how to verify the result.

Avoid generic headings such as “Overview,” “Details,” and “Conclusion” when a specific heading would carry more information.

Keep hierarchy shallow. Use paragraphs for an argument, bullets for genuinely parallel items, numbered lists for sequence, and tables only for repeated-field comparisons. Do not turn every sentence into a bullet.

Use zero to three labels that remain useful across notes. Prefer stable domains or concepts over status words, one-off phrases, or every noun appearing in the body.

## Choose a useful note shape

Choose only the shape that matches the retrieval need. Combine shapes when necessary, but do not emit every section by default.

### Concept or mechanism

- State the mental model.
- Explain why the mechanism exists and how its parts interact.
- Contrast it with the nearest confusing concept.
- Show one representative example and one important boundary.

### Comparison or decision

- State the decision context.
- Define the criteria before listing alternatives.
- Compare tradeoffs under the same constraints.
- Record the chosen direction, rationale, assumptions, and trigger for reconsideration when a decision was made.

### Procedure or operational reference

- State the outcome and prerequisites.
- Give the minimal ordered steps.
- Include exact commands or code only where precision matters.
- Explain how to verify success and recover from likely failure.
- Explain the non-obvious reason behind a fragile step.

### Source synthesis

- Identify the source's central claim and scope.
- Reconstruct the supporting reasoning or evidence.
- Separate the source's claim from the agent's interpretation.
- Record limitations, contested points, and implications for the learner's context.
- Link the actual source.

### Debugging or incident learning

- Record the observable symptom and relevant context.
- Explain the root mechanism, not only the final fix.
- Distinguish the root cause from incidental failed attempts.
- Include diagnosis signals, verified resolution, and a prevention or detection rule.

## Evidence and uncertainty

Use the source rules in `SKILL.md`. Add evidence where it changes confidence, scope, or action; do not decorate obvious claims with irrelevant links.

For each consequential claim, determine whether it is:

- directly established by a primary or authoritative source;
- observed in the learner's concrete example;
- a reasonable inference that should be labeled as such;
- unresolved or version-dependent and should remain an open point.

Never silently turn a hypothesis from the conversation into a fact. When sources disagree, state the disagreement and the conditions that may explain it instead of forcing false certainty.

Verify that a source supports the note's claims and points to the relevant page, not merely a homepage. Check dates and versions for software, APIs, laws, prices, policies, and other unstable material. Store only sources actually consulted with `lingo note source add`, including a concise description of what each source established for the note; do not duplicate them in Markdown.

Preserve precise foreign-language terms as instructed by `SKILL.md`. Define a term on first use when useful, then use one consistent form throughout the content and questions.

## Examples and exact material

Use examples to reveal the model, not to add decoration.

- Choose the smallest realistic example that exposes the important mechanism.
- Explain why the example behaves as shown.
- Add a counterexample or boundary case when it prevents a likely overgeneralization.
- Keep code focused on the learning point and compatible with the stated version.
- Run code or commands when feasible; otherwise say that they are illustrative.
- Never invent observed output, benchmark results, error messages, or source quotations.
- Preserve exact identifiers, flags, field names, and API terms when precision matters.

Avoid examples that merely rename variables from the source or introduce a large amount of unrelated setup.

## Question alignment

Practice is optional for a standalone note. Do not generate questions merely because a note was created or deepened. When the user explicitly asks to practice, review, or test their understanding, derive the smallest useful check after the content model is stable.

Map the requested question to the note brief:

- test the central mechanism with a self-explanation question;
- test a likely conflation with a scenario-based multiple-choice question;
- test application with a small changed constraint;
- test a boundary by asking when the model stops applying;
- test a decision by asking which criterion changes the choice.

Do not ask the learner to recall an isolated sentence, number, or name unless exact recall is the real learning objective. Do not create a question whose answer requires facts omitted from the note.

Make subjective `referenceAnswer` values evaluation rubrics: include essential reasoning, acceptable variants, and the most important misconception to catch when relevant. Make multiple-choice distractors plausible consequences of incomplete models, not jokes or obviously unrelated statements.

Keep the question prompt to one sentence and one understanding target that can usually be answered in about one minute. Keep prompts independent of formatting and source wording. A learner should need to retrieve and reconstruct the model rather than recognize a copied phrase. Avoid long scenarios and multiple questions that test the same target in different formats.

## Deepen without creating a junk drawer

Read the existing body before changing it. Rebuild one coherent note rather than appending a dated fragment.

- Preserve still-valid explanations and useful examples.
- Replace superseded facts instead of leaving contradictions side by side.
- Mark a genuine unresolved disagreement rather than pretending it is resolved.
- Reorganize the whole note when the new model changes its structure.
- Keep the note's original retrieval need unless the user explicitly wants to repurpose it.
- Create or recommend a separate note when new material has an independent retrieval need.
- Recheck an old question only when it is available in the supplied context. The current CLI cannot list, edit, or delete the complete existing question bank, so never claim it was reviewed when it was not. If a substantive rewrite may invalidate old questions, tell the user to review them in the workspace and create replacement questions only when useful.

Do not create a duplicate when the user supplied an existing note ID or URL and the new material belongs to that note.

## Quality gate

Before saving, verify:

- [ ] The title is concrete, searchable, and useful as a future retrieval cue.
- [ ] The note serves one cohesive retrieval need.
- [ ] The opening states the core model or useful conclusion.
- [ ] The content can stand alone without the original conversation.
- [ ] Necessary causal links, prerequisites, and decision criteria remain intact.
- [ ] The structure follows the topic's logic rather than conversation or source order.
- [ ] At least one useful example, distinction, boundary, or application is present when the topic needs it.
- [ ] Claims, inferences, and unresolved uncertainty are not conflated.
- [ ] Version-sensitive or consequential claims are verified when feasible.
- [ ] Terminology is precise and consistent.
- [ ] The note contains no transcript language, filler, decorative sections, or forced template headings.
- [ ] Every requested question maps to the content and a meaningful understanding target.

After saving substantive content, run `lingo note content get <note-id>` and apply this **post-save quality gate**:

- [ ] The complete Markdown body was stored without quoting or newline corruption.
- [ ] Headings, lists, tables, code, and links remain readable.
- [ ] Every required content command and any requested question command returned `ok: true`.
- [ ] Requested questions do not reveal their answers through wording or option shape.
- [ ] Any existing questions that could not be inspected are reported instead of silently treated as current.
- [ ] The returned note URL and any incomplete operation are reported honestly.

Do not call a note ready when its content failed to save. If question creation partially fails, preserve the note, identify the missing question operation, and return the note URL with the limitation.

## Evidence basis

Use these findings as support for reconstruction and active recall, not as a universal note template:

- [Chi et al. (1989), Self-explanations](https://doi.org/10.1207/s15516709cog1302_1): successful learners in the studied worked-example setting generated explanations that connected actions to principles and monitored gaps in understanding.
- [Karpicke & Blunt (2011), Retrieval practice](https://pubmed.ncbi.nlm.nih.gov/21252317/): retrieval practice supported meaningful learning and inference on the studied science material.
- [Davis & Hult (1997), Generative summaries during note taking](https://doi.org/10.1177/009862839702400112): summary writing during lecture pauses improved delayed outcomes in the reported classroom study.
