import { describe, expect, test } from "bun:test";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("UI iconography", () => {
  test("uses Lucide icons for the note status dropdown", async () => {
    const source = await readSource(
      "src/ui/features/note-status/NoteStatusSelect.tsx",
    );

    expect(source).toContain(
      'import { Check, ChevronDown } from "lucide-react";',
    );
    expect(source).toContain('<ChevronDown aria-hidden="true" />');
    expect(source).toContain('<Check aria-hidden="true" />');
    expect(source).not.toContain(">⌄<");
    expect(source).not.toContain(">✓<");
  });
});
