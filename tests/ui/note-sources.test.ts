import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NoteSources } from "../../src/ui/features/note-sources/NoteSources";
import { extractLegacySources } from "../../src/ui/features/note-sources/legacy-sources";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

test("extracts only a strict final legacy Sources list", () => {
  expect(
    extractLegacySources(`## 핵심\n\n본문입니다.\n\n## Sources\n\n- [Effect docs](https://effect.website/docs/) — API 계약 확인\n- [TypeScript](https://www.typescriptlang.org/docs/)`),
  ).toEqual({
    content: "## 핵심\n\n본문입니다.",
    sources: [
      {
        title: "Effect docs",
        url: "https://effect.website/docs/",
        description: "API 계약 확인",
      },
      {
        title: "TypeScript",
        url: "https://www.typescriptlang.org/docs/",
        description: null,
      },
    ],
  });

  const ambiguous = "## Sources\n\n이 문단은 링크 목록이 아닙니다.";
  expect(extractLegacySources(ambiguous)).toEqual({
    content: ambiguous,
    sources: [],
  });
});

test("renders sources as small local-icon links without descriptive cards", async () => {
  const html = renderToStaticMarkup(
    createElement(NoteSources, {
      sources: [
        {
          title: "Effect documentation",
          url: "https://www.effect.website/docs/error-management/",
          description: "Error handling semantics checked for this note.",
        },
      ],
    }),
  );
  const [component, css, overview] = await Promise.all([
    readSource("src/ui/features/note-sources/NoteSources.tsx"),
    readSource("src/ui/features/note-sources/NoteSources.module.css"),
    readSource("src/ui/pages/note-overview/NoteOverviewPage.tsx"),
  ]);

  expect(html).toContain("출처");
  expect(html).toContain("Effect documentation");
  expect(html).toContain("effect.website");
  expect(html).toContain('aria-hidden="true">effect.website</span>');
  expect(html).toContain("effect.website, 새 탭으로 열기");
  expect(html).not.toContain("Error handling semantics checked for this note.");
  expect(html).toContain('target="_blank"');
  expect(component).toContain('from "@base-ui/react/collapsible"');
  expect(component).toContain("Globe2");
  expect(component).not.toContain("<img");
  expect(component).not.toContain("fetch(");
  expect(css).toContain("min-height: 30px");
  expect(css).toContain("flex-wrap: wrap");
  expect(overview).toContain("<NoteSources");
});
