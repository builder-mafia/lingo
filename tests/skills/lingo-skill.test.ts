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
    expect(skill).toContain("lingo question add");
    expect(skill).toContain("lingo answer list");
    expect(skill).toContain("lingo evaluation set");
    expect(skill).toContain("lingo course create");
    expect(skill).toContain("references/cli.md");
    expect(skill).not.toContain("lingo note summary set");
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
    expect(skill).toContain("Sources");
    expect(skill).toContain("Do not write a transcript");
  });

  test("creates a mixed practice set by default", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");

    expect(skill).toContain("at least one subjective question");
    expect(skill).toContain("at least one multiple-choice question");
    expect(skill).toContain("three or four choices");
    expect(skill).toContain("plausible misconception");
    expect(skill).not.toContain("Default to subjective questions");
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
