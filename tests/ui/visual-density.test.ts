import { describe, expect, test } from "bun:test";

const readStyle = (relativePath: string) =>
  Bun.file(new URL(`../../src/ui/${relativePath}`, import.meta.url)).text();

describe("UI visual density", () => {
  test("uses readable base type and distinct interaction surfaces", async () => {
    const styles = await readStyle("styles/global.css");

    expect(styles).toContain("--color-surface-hover: #eceef2;");
    expect(styles).toContain("--color-surface-active: #e3e7f8;");
    expect(styles).toContain("--color-border: #d5d8df;");
    expect(styles).toContain("--color-border-strong: #b9bec9;");
    expect(styles).toContain("font-size: 15px;");
  });

  test("gives the notes workspace larger reading and interaction targets", async () => {
    const [notes, search, status] = await Promise.all([
      readStyle("pages/notes/NotesPage.module.css"),
      readStyle("features/note-search/NoteSearch.module.css"),
      readStyle("features/note-status/NoteStatusSelect.module.css"),
    ]);

    expect(notes).toContain("grid-template-columns: minmax(0, 1fr) 344px;");
    expect(notes).toContain("min-height: 68px;");
    expect(notes).toContain("font-size: 14px;");
    expect(notes).toContain("background: var(--color-surface-hover);");
    expect(notes).toContain("background: var(--color-surface-active);");
    expect(notes).toContain("align-content: start;");
    expect(search).toContain("min-height: 38px;");
    expect(search).toContain("font-size: 13px;");
    expect(status).toContain("min-height: 36px;");
    expect(status).toContain("font-size: 13px;");
  });
});
