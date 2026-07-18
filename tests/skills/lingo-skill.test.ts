import { describe, expect, test } from "bun:test";

const readProjectFile = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("Lingo agent skill", () => {
  test("is discoverable and documents the complete learning workflow", async () => {
    const skill = await readProjectFile("skills/lingo/SKILL.md");

    expect(skill).toMatch(/^---\nname: lingo\ndescription: .+\n---/);
    expect(skill).toContain("lingo note create");
    expect(skill).toContain("lingo note summary set");
    expect(skill).toContain("lingo question add");
    expect(skill).toContain("lingo answer list");
    expect(skill).toContain("lingo evaluation set");
    expect(skill).toContain("references/cli.md");
  });

  test("publishes the skills CLI installation command", async () => {
    const readme = await readProjectFile("README.md");

    expect(readme).toContain(
      "npx skills add builder-mafia/lingo --skill lingo",
    );
  });
});
