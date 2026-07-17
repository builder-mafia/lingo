import { describe, expect, test } from "bun:test";

import { createNoteSchema } from "../../src/schemas/note";

describe("createNoteSchema", () => {
  test("trims metadata and removes duplicate labels in their original order", () => {
    expect(
      createNoteSchema.parse({
        title: "  Effect 오류 모델  ",
        labels: [" TypeScript ", "Effect", "TypeScript"],
      }),
    ).toEqual({
      title: "Effect 오류 모델",
      labels: ["TypeScript", "Effect"],
    });
  });

  test("defaults labels to an empty list", () => {
    expect(createNoteSchema.parse({ title: "Effect 오류 모델" })).toEqual({
      title: "Effect 오류 모델",
      labels: [],
    });
  });

  test("rejects empty titles and labels", () => {
    expect(() => createNoteSchema.parse({ title: "   " })).toThrow();
    expect(() =>
      createNoteSchema.parse({ title: "제목", labels: ["   "] }),
    ).toThrow();
  });
});
