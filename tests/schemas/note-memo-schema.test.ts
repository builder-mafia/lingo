import { describe, expect, test } from "bun:test";

import { setNoteMemoSchema } from "../../src/schemas/note-memo";

describe("setNoteMemoSchema", () => {
  test("preserves freeform text and accepts blank content for clearing", () => {
    expect(setNoteMemoSchema.parse({ content: "  떠오른 생각\n- 다음 실험  " })).toEqual({
      content: "  떠오른 생각\n- 다음 실험  ",
    });
    expect(setNoteMemoSchema.parse({ content: "   " })).toEqual({
      content: "   ",
    });
  });

  test("rejects non-text and oversized memo content", () => {
    expect(() => setNoteMemoSchema.parse({ content: 1 })).toThrow();
    expect(() => setNoteMemoSchema.parse({ content: "a".repeat(100_001) })).toThrow();
  });
});
