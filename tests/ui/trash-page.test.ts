import { describe, expect, test } from "bun:test";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("trash management UI", () => {
  test("loads trash in a lazy route and links to it from notes", async () => {
    const [router, notes, api] = await Promise.all([
      readSource("src/ui/app/router.tsx"),
      readSource("src/ui/pages/notes/NotesPage.tsx"),
      readSource("src/ui/shared/api/workspace.ts"),
    ]);

    expect(router).toContain('path: "trash"');
    expect(router).toContain("loadTrash");
    expect(router).toContain('import("../pages/trash/TrashPage")');
    expect(notes).toContain("routePaths.trash");
    expect(api).toContain("restoreNote");
    expect(api).toContain("permanentlyDeleteNote");
  });

  test("uses a Base UI alert dialog before permanent deletion", async () => {
    const [page, row] = await Promise.all([
      readSource("src/ui/pages/trash/TrashPage.tsx"),
      readSource("src/ui/pages/trash/TrashNoteRow.tsx"),
    ]);

    expect(page).toContain('from "./TrashNoteRow"');
    expect(row).toContain('from "@base-ui/react/alert-dialog"');
    expect(row).toContain("RotateCcw");
    expect(row).toContain("Trash2");
    expect(row).toContain("복원");
    expect(row).toContain("영구 삭제");
  });
});
