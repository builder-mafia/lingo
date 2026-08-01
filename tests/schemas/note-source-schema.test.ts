import { describe, expect, test } from "bun:test";

import { createNoteSourceSchema } from "../../src/schemas/note-source";

describe("note source schema", () => {
  test("normalizes a descriptive HTTP source", () => {
    expect(
      createNoteSourceSchema.parse({
        title: "  Effect documentation  ",
        url: "https://effect.website/docs/error-management/",
        description: "  Error handling contracts checked for this note.  ",
      }),
    ).toEqual({
      title: "Effect documentation",
      url: "https://effect.website/docs/error-management/",
      description: "Error handling contracts checked for this note.",
    });
  });

  test("rejects non-web URLs", () => {
    expect(
      createNoteSourceSchema.safeParse({
        title: "Unsafe source",
        url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});
