import { describe, expect, test } from "bun:test";

const readProjectFile = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("Lingo agent skill", () => {
  test("is discoverable and documents the complete learning workflow", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");

    expect(skill).toMatch(/^---\nname: lingo\ndescription: .+\n---/);
    expect(skill).toContain("lingo note create");
    expect(skill).toContain("lingo note content set");
    expect(skill).toContain("lingo note content get");
    expect(skill).toContain("lingo note memo set");
    expect(skill).toContain("lingo note memo get");
    expect(skill).toContain("lingo relation add");
    expect(skill).toContain("lingo relation list");
    expect(skill).toContain("lingo relation remove");
    expect(skill).toContain("lingo note source add");
    expect(skill).toContain("lingo note source list");
    expect(skill).toContain("lingo note source remove");
    expect(skill).toContain("lingo question add");
    expect(skill).toContain("lingo answer list");
    expect(skill).toContain("lingo evaluation set");
    expect(skill).toContain("lingo course create");
    expect(skill).toContain("references/cli.md");
    expect(skill).not.toContain("lingo note summary set");
  });

  test("creates note relations only from explicit user intent", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");

    expect(skill).toContain("Do not infer or automatically create relations");
    expect(skill).toContain("only when the user explicitly asks to connect notes");
    expect(skill).toContain("undirected");
  });

  test("treats memo as user-owned scratch space with opt-in review", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");

    expect(skill).toContain("user-owned scratch space");
    expect(skill).toContain("only when the user explicitly asks for feedback");
    expect(skill).toContain("Do not copy generated note content into the memo");
    expect(skill).toContain("or automatically evaluate every memo");
  });

  test("builds systematic courses as ordered chapter notes", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");
    const reference = await readProjectFile("skills/lingo/references/cli.md");

    expect(skill).toContain("Design a systematic course");
    expect(skill).toContain("learning outcome");
    expect(skill).toContain("prerequisite order");
    expect(skill).toContain("Capture every chapter `noteId`");
    expect(skill).toContain("failed chapter IDs");
    expect(reference).toContain("## Create a course");
    expect(reference).toContain('"chapters"');
  });

  test("requires learner discovery and a quality gate before creating a course", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");
    const courseDesign = await readProjectFile(
      "skills/lingo/references/course-design.md",
    );

    expect(skill).toContain("references/course-design.md");
    expect(skill).toContain("Do not create the course yet");
    expect(skill).toContain("minimum viable clarification");
    expect(courseDesign).toContain("## Learner discovery");
    expect(courseDesign).toContain("## Curriculum construction");
    expect(courseDesign).toContain("## Assessment design");
    expect(courseDesign).toContain("## Quality gate");
    expect(courseDesign).toContain("transfer task");
    expect(courseDesign).toContain("authoritative sources");
  });

  test("creates durable content with useful evidence and sources", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");

    expect(skill).toContain("infer the user's current understanding");
    expect(skill).toContain("authoritative sources");
    expect(skill).toContain("structured source");
    expect(skill).not.toContain("final `## Sources` section");
    expect(skill).toContain("Do not write a transcript");
  });

  test("synthesizes cohesive notes around a future retrieval need", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");
    const noteDesign = await readProjectFile(
      "skills/lingo/references/note-design.md",
    );

    expect(skill).toContain("references/note-design.md");
    expect(skill).toContain("note brief");
    expect(skill).toContain("post-save quality gate");
    expect(noteDesign).toContain("## Capture intent");
    expect(noteDesign).toContain("## Synthesis process");
    expect(noteDesign).toContain("## Information architecture");
    expect(noteDesign).toContain("## Evidence and uncertainty");
    expect(noteDesign).toContain("## Question alignment");
    expect(noteDesign).toContain("## Quality gate");
    expect(noteDesign).toContain("future retrieval cue");
    expect(noteDesign).toContain(
      "current CLI cannot list, edit, or delete the complete existing question bank",
    );
    expect(skill).toContain("do not claim old questions were rechecked");
  });

  test("keeps practice optional and concise", async () => {
    const [skill, courseDesign] = await Promise.all([
      readProjectFile("skills/lingo/SKILL.md"),
      readProjectFile("skills/lingo/references/course-design.md"),
    ]);

    expect(skill).toContain("zero questions by default");
    expect(skill).toContain(
      "Only add a question when the user explicitly asks to practice, review, or test their understanding",
    );
    expect(skill).toContain("one short question by default");
    expect(skill).toContain("one sentence");
    expect(skill).toContain("roughly one minute");
    expect(skill).not.toContain("at least one subjective question");
    expect(skill).not.toContain("at least one multiple-choice question");
    expect(courseDesign).toContain("one short question per chapter by default");
    expect(courseDesign).not.toContain("two to five questions per chapter");
  });

  test("preserves meaning-sensitive terminology from foreign sources", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");

    expect(skill).toContain("Preserve the original term");
    expect(skill).toContain("translation would lose precision");
    expect(skill).toContain("brief Korean explanation");
    expect(skill).toContain("content, questions, choices, and feedback");
  });

  test("writes question prompts as plain text", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");
    const reference = await readProjectFile("skills/lingo/references/cli.md");

    expect(skill).toContain("Write the `question` field as plain text");
    expect(skill).toContain("Do not use Markdown syntax");
    expect(reference).toContain("Question text is plain text, not Markdown");
  });

  test("publishes the skills CLI installation command", async () => {
    const readme = await readProjectFile("README.md");

    expect(readme).toContain(
      "npx skills add builder-mafia/lingo --skill lingo",
    );
  });
});
