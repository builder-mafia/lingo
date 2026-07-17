import { describe, expect, test } from "bun:test";

import {
  noteStatusSchema,
  setNoteStatusSchema,
} from "../../src/schemas/note-status";

describe("note status schema", () => {
  test("accepts the four workflow states", () => {
    expect(
      ["not_started", "in_progress", "completed", "deferred"].map(
        (status) => noteStatusSchema.parse(status),
      ),
    ).toEqual(["not_started", "in_progress", "completed", "deferred"]);
  });

  test("rejects understanding scores and unknown states", () => {
    expect(noteStatusSchema.safeParse("mastered").success).toBe(false);
    expect(setNoteStatusSchema.safeParse({ status: "done" }).success).toBe(
      false,
    );
  });
});
