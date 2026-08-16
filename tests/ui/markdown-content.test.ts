import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownContent } from "../../src/ui/shared/markdown/MarkdownContent";
import { toContentPreview } from "../../src/ui/shared/markdown/content-preview";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("Markdown note content", () => {
  test("renders bold text when a Korean particle follows the closing marker", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownContent, {
        content:
          "**Liskov Substitution Principle(LSP, 리스코프 치환 원칙)**은 subtype의 계약을 지킨다.",
      }),
    );

    expect(html).toContain(
      "<strong>Liskov Substitution Principle(LSP, 리스코프 치환 원칙)</strong>은",
    );
    expect(html).not.toContain("**");
  });

  test("keeps list previews readable without rendering every Markdown tree", () => {
    expect(
      toContentPreview(`
## 핵심

- **브랜치**는 이동한다.
- [Release](https://github.com)에는 배포 파일이 연결된다.
`),
    ).toBe("핵심 브랜치는 이동한다. Release에는 배포 파일이 연결된다.");
  });

  test("renders GFM tables as accessible semantic tables", () => {
    const html = renderToStaticMarkup(
      createElement(MarkdownContent, {
        content: `| 표현 | 의미 | 예문 |
| --- | --- | --- |
| underpin | 기반이 되다 | Trust underpins the relationship. |`,
      }),
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="표"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<th>표현</th>");
    expect(html).toContain("<td>underpin</td>");
  });

  test("renders Markdown only in lazy note detail routes", async () => {
    const [packageJson, markdown, overview, question, notes, noteRow] =
      await Promise.all([
        Bun.file(new URL("../../package.json", import.meta.url)).json(),
        readSource("src/ui/shared/markdown/MarkdownContent.tsx"),
        readSource("src/ui/pages/note-overview/NoteOverviewPage.tsx"),
        readSource(
          "src/ui/pages/question-session/QuestionSessionPage.tsx",
        ),
        readSource("src/ui/pages/notes/NotesPage.tsx"),
        readSource("src/ui/pages/notes/NoteRow.tsx"),
      ]);

    expect(packageJson.dependencies["react-markdown"]).toBeDefined();
    expect(packageJson.dependencies["remark-cjk-friendly"]).toBeDefined();
    expect(packageJson.dependencies["remark-gfm"]).toBeDefined();
    expect(markdown).toContain('from "react-markdown"');
    expect(markdown).toContain('from "remark-cjk-friendly"');
    expect(markdown).toContain('from "remark-gfm"');
    expect(markdown).toContain(
      "remarkPlugins={[remarkCjkFriendly, remarkGfm]}",
    );
    expect(markdown).toContain("memo(");
    expect(markdown).not.toContain("rehypeRaw");
    expect(overview).toContain("<MarkdownContent");
    expect(question).toContain("<MarkdownContent");
    expect(noteRow).toContain("toContentPreview(note.content)");
    expect(notes).not.toContain("<MarkdownContent");
    expect(noteRow).not.toContain("<MarkdownContent");
  });

  test("teaches agents to persist note content as structured Markdown", async () => {
    const [skill, reference] = await Promise.all([
      readSource("skills/lingo/SKILL.md"),
      readSource("skills/lingo/references/cli.md"),
    ]);

    expect(skill).toContain("Write the content as Markdown");
    expect(skill).toContain("Do not add a top-level heading");
    expect(reference).toContain("Note content supports Markdown");
  });
});
