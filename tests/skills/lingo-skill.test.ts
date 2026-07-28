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
    expect(skill).toContain("references/cli.md");
    expect(skill).not.toContain("lingo note summary set");
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

  test("publishes the skills CLI installation command", async () => {
    const readme = await readProjectFile("README.md");

    expect(readme).toContain(
      "npx skills add builder-mafia/lingo --skill lingo",
    );
  });
});
