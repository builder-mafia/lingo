import { expect, test } from "bun:test";

const readProjectFile = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

test("aligns top navigation indicators to their text labels", async () => {
  const [shell, styles] = await Promise.all([
    readProjectFile("src/ui/layouts/app-shell/AppShell.tsx"),
    readProjectFile("src/ui/layouts/app-shell/AppShell.module.css"),
  ]);

  expect(shell).toContain("<span>노트</span>");
  expect(shell).toContain("<span>코스</span>");
  expect(styles).toContain(".navigation a > span::after");
  expect(styles).not.toContain(".navigation a::after");
});

test("uses controlled Base UI filters and a quieter Notes overflow menu", async () => {
  const [page, pageStyles, filter, filterStyles, menu] = await Promise.all([
    readProjectFile("src/ui/pages/notes/NotesPage.tsx"),
    readProjectFile("src/ui/pages/notes/NotesPage.module.css"),
    readProjectFile("src/ui/features/note-filters/NoteFilterSelect.tsx"),
    readProjectFile("src/ui/features/note-filters/NoteFilterSelect.module.css"),
    readProjectFile("src/ui/features/notes-menu/NotesMenu.tsx"),
  ]);

  expect(page).toContain("CircleDashed");
  expect(page).toContain("NoteFilterSelect");
  expect(page).toContain('searchParams.get("label")');
  expect(page).toContain("onFilterLabel");
  expect(page).not.toContain("styles.trashLink");
  expect(filter).toContain('from "@base-ui/react/select"');
  expect(filter).toContain("ChevronDown");
  expect(filterStyles).toContain("width: var(--anchor-width);");
  expect(filterStyles).not.toContain("max(var(--anchor-width)");
  expect(menu).toContain('from "@base-ui/react/menu"');
  expect(menu).toContain("Ellipsis");
  expect(menu).toContain("Trash2");
  expect(menu).toContain("routePaths.trash");
  expect(pageStyles).toContain(".toolbar > * { flex: 0 0 auto; }");
});
