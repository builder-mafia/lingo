# Course Design Reference

Read this reference completely before designing or creating a Lingo course. Use it to turn a broad topic into a bounded learning path that matches the learner, rather than an exhaustive table of contents.

## Contents

- [Learner discovery](#learner-discovery)
- [Conversation protocol](#conversation-protocol)
- [Curriculum construction](#curriculum-construction)
- [Chapter content](#chapter-content)
- [Assessment design](#assessment-design)
- [Source quality](#source-quality)
- [Course preview](#course-preview)
- [Quality gate](#quality-gate)
- [Evidence basis](#evidence-basis)

## Learner discovery

Infer answers already present in the conversation, then resolve only the gaps that could materially change the course.

Establish these four inputs:

1. **Target capability:** What should the learner be able to explain, decide, diagnose, or build after the course? Tie it to a realistic context.
2. **Starting point:** What relevant concepts or tools can the learner already use? Ask for evidence such as a project, explanation, or example rather than a self-rating alone.
3. **Scope and priority:** What must be included, what may be omitted, and which project, document, exam, or problem defines the boundary?
4. **Learning constraints:** How much total time and depth are appropriate? Note deadlines, session length, required versions, runtime, language, or inaccessible sources when relevant.

Ask conditional questions only when they affect the path:

- the exact library, specification, product version, or environment;
- a real project or deliverable the learner intends to complete;
- a known point of confusion or a previous failed approach;
- whether official sources only are required or trusted secondary explanations are acceptable;
- language and terminology preferences not already known;
- accessibility needs or constraints on running examples.

Do not ask about formatting preferences that Lingo already defines. Do not ask the user to design the curriculum for the agent.

If no time constraint is provided, default to a focused practical introduction: explain the core mechanism, distinguish the main alternatives, and apply them in a small unfamiliar situation. State this assumption.

## Conversation protocol

Use **minimum viable clarification**: gather enough information to prevent a materially wrong course, then make reversible design decisions with stated assumptions.

- Ask unresolved high-impact questions together in one compact message, normally no more than four.
- Explain in one sentence why the answers change the course.
- Offer a default for any answer the learner may not know.
- Ask a second round only when the answers conflict or expose a new high-impact ambiguity.
- Do not repeat questions already answered in the conversation.
- Do not turn discovery into a long intake form.

For a broad request such as “Make me an Effect course,” ask:

1. What should you be able to do when the course is useful?
2. What relevant TypeScript, async, and Effect experience do you already have?
3. What must be included or excluded?
4. What time budget and depth should the path assume?

If the user explicitly says to use best judgment, skip the interview, declare the assumed learner profile, scope, and effort, and continue. If only one critical fact is missing, ask only that question.

Because the current CLI cannot edit, delete, or reorder a course, preview an ambiguous or substantial curriculum before creation. Do not require another confirmation when the user has already approved the outline, fully specified the path, or explicitly delegated the decision and asked the agent to proceed.

## Curriculum construction

Work backward from use, not forward from a source's table of contents.

1. Write one course outcome as **action + subject + application context**.
2. Define a small terminal task that would demonstrate the outcome.
3. Identify the concepts and decisions required by that task.
4. Order them by prerequisite dependency, not by alphabetical order or API category.
5. Group adjacent dependencies into coherent chapters.
6. Write one observable objective for every chapter.
7. Map each objective to at least one assessment before creating content.

Use verbs such as explain, distinguish, apply, compare, choose, diagnose, and reconstruct. Avoid objectives that only say understand, learn, know, or become familiar with.

Prefer three to seven chapters for an initial course. The CLI permits two, but do not pad a narrow topic. If a path grows beyond roughly eight chapters, check whether it contains multiple outcomes that should become separate courses.

Use these sequencing heuristics when they fit the domain:

- establish the problem and core mental model before a large API surface;
- introduce the smallest useful capability early;
- move from a worked example toward partially guided and independent application for novices;
- introduce distinctions and failure modes near the concepts they constrain;
- make later chapters reuse earlier ideas without duplicating their content;
- end with integration or transfer, not a recap-only chapter.

Do not mechanically force one sequence onto every domain. Let prerequisite relationships and the learner's existing knowledge override the generic progression. Do not create an operator catalog disguised as a course.

Each chapter should contain one meaningful conceptual bottleneck or capability. A learner should be able to revisit the chapter as a useful note, while still understanding why it appears at that point in the course.

## Chapter content

Build content that enables the chapter objective rather than merely describing the topic. Include only the elements that help the learner form and test a model:

- the question or problem the chapter resolves;
- the core mechanism and its causal explanation;
- a concrete example or worked example when application matters;
- a distinction or misconception likely to expose false confidence;
- decision criteria, constraints, or tradeoffs used in practice;
- a short connection to prior or subsequent chapters when needed.

Adapt guidance to the starting point. Give novices more explicit worked examples and make hidden reasoning visible. Give experienced learners fewer basic explanations and more boundary cases, tradeoffs, diagnosis, and transfer. Do not equate more text with greater depth.

Keep each note self-contained and use the terminology rules in `SKILL.md`. Store each chapter's consulted documents as structured sources with `lingo note source add`; do not copy the same generic source set into every chapter or duplicate it in Markdown.

## Assessment design

Align questions directly with the observable objective:

| Objective | Useful assessment |
| --- | --- |
| Explain | Ask for a causal explanation in the learner's own words. |
| Distinguish | Present similar concepts in a concrete scenario and require a choice with reasoning. |
| Apply | Give a new but bounded situation that cannot be answered by copying the example. |
| Diagnose | Present a failure or flawed model and ask for the cause and next action. |
| Choose | Present a tradeoff and require criteria for the decision. |

Use retrieval questions as learning events, not only as completion checks. Create one short question per chapter by default. Keep it to one sentence, one understanding target, and a scope the learner can usually answer in about one minute. Prefer a concise multiple-choice distinction when appropriate; use a subjective question only when the objective genuinely requires explanation, synthesis, or transfer.

Include at least one cumulative **transfer task** in the final chapter. Require the learner to combine ideas from earlier chapters in a small unfamiliar situation. Do not make every chapter depend on a large project the learner cannot complete during review.

For every question:

- verify that a correct answer demonstrates the objective;
- prefer mechanism, distinction, decision, and application over trivia;
- make a multiple-choice distractor represent a plausible misconception;
- make the subjective `referenceAnswer` an evaluation rubric, including the essential reasoning and acceptable variation;
- avoid clues based on option length, grammar, or repeated source wording;
- avoid testing facts that the content never enables the learner to reconstruct.

Completion is not proof of mastery. Do not promise mastery, assign a hidden score, or make later chapters inaccessible.

## Source quality

Create a source map before finalizing the outline when the domain has external authority. Prefer:

1. official documentation, standards, specifications, and maintained reference material;
2. original research, primary sources, and material from the authors or maintainers;
3. first-party examples, migration guides, and release notes for version-sensitive behavior;
4. reputable technical books or educational material for supporting explanation;
5. secondary articles only when they clarify a point without replacing authoritative sources.

Use **authoritative sources** to establish claims, boundaries, terminology, and current behavior. Verify the relevant version and publication date. Consult the actual page rather than relying on a search-result excerpt.

Map sources to chapters and claims. Use only sources actually consulted. Cross-check a contested or context-dependent claim. Compare code examples with current official APIs and run them when feasible. Never invent a citation or use an AI-generated article as evidence.

Research should improve the learner's model, not turn the note into copied documentation or a link collection.

## Course preview

Before calling `lingo course create`, show a compact curriculum brief when confirmation is required:

- **Target learner:** starting point and relevant prerequisites;
- **Outcome:** observable end capability;
- **Scope:** included topics, explicit exclusions, version, and assumed effort;
- **Path:** ordered chapter titles and one objective per chapter;
- **Assessment:** the final transfer task and any important chapter-level checks;
- **Sources:** the primary source families that shape the path;
- **Assumptions:** decisions made because information was unavailable.

Ask for approval of the direction, not line-by-line copyediting. After approval, treat small wording and example choices as implementation details.

## Quality gate

Before course creation, verify all of the following:

- [ ] The outcome names an observable capability and realistic context.
- [ ] The path reflects the learner's starting point and prerequisites.
- [ ] Included and excluded scope is clear enough to prevent uncontrolled expansion.
- [ ] Time, depth, version, and environment constraints are reflected or stated as assumptions.
- [ ] Chapter order follows prerequisite dependencies.
- [ ] Every chapter has one distinct observable objective.
- [ ] The first chapter provides a useful capability rather than only vocabulary.
- [ ] The final path includes integration or transfer.
- [ ] Authoritative sources have been checked before the outline is fixed.
- [ ] Every objective has a planned assessment.
- [ ] The user has approved the direction when confirmation is required.

After filling the chapters, verify:

- [ ] Every chapter note contains enough context to stand alone.
- [ ] Examples, distinctions, and depth match the learner profile.
- [ ] Terminology and source-sensitive claims are consistent across chapters.
- [ ] Questions test their chapter objective rather than source trivia.
- [ ] Each chapter has one short question unless the user requested otherwise.
- [ ] Each question tests one meaningful target without a long setup.
- [ ] The final chapter contains a cumulative transfer task.
- [ ] Every consulted source is directly relevant and correctly linked.
- [ ] Every required CLI response returned `ok: true`.
- [ ] Any failed chapter ID and unfinished content or question is reported precisely.

Do not create or claim a ready course when a pre-creation gate that would materially change the path is unresolved.

## Evidence basis

Apply these findings as design evidence, not as rigid templates:

- [Roediger & Karpicke (2006), Test-enhanced learning](https://pubmed.ncbi.nlm.nih.gov/16507066/): retrieval practice improved delayed retention compared with repeated study.
- [Karpicke & Blunt (2011), Retrieval practice and meaningful learning](https://pubmed.ncbi.nlm.nih.gov/21252317/): retrieval practice supported learning of complex conceptual material.
- [Dunlosky et al. (2013), Effective learning techniques](https://pubmed.ncbi.nlm.nih.gov/26173288/): practice testing and distributed practice received broad support across learning conditions.
- [van Gog et al. (2011), Worked examples for novices](https://doi.org/10.1016/j.cedpsych.2010.10.004): worked examples and example-problem pairs reduced load and improved novice learning in the studied task.
