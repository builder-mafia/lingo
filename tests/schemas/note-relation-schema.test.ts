import { describe, expect, test } from "bun:test";

import {
  createNoteRelationSchema,
  noteRelationSchema,
} from "../../src/schemas/note-relation";

const firstNoteId = "10f3c50f-9dda-477a-8f89-5f63838dd2b5";
const secondNoteId = "e7b6098f-b384-41e4-84cf-ec6f36acc050";

describe("note relation schema", () => {
  test("accepts one target note and a canonical undirected relation", () => {
    expect(createNoteRelationSchema.parse({ targetNoteId: secondNoteId })).toEqual({
      targetNoteId: secondNoteId,
    });
    expect(
      noteRelationSchema.parse({
        id: "6e86d62e-68b3-43a4-b832-e42d91e7a07d",
        noteAId: firstNoteId,
        noteBId: secondNoteId,
        createdAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toMatchObject({ noteAId: firstNoteId, noteBId: secondNoteId });
  });

  test("rejects a reversed or self relation", () => {
    const base = {
      id: "6e86d62e-68b3-43a4-b832-e42d91e7a07d",
      createdAt: "2026-08-01T00:00:00.000Z",
    };

    expect(
      noteRelationSchema.safeParse({
        ...base,
        noteAId: secondNoteId,
        noteBId: firstNoteId,
      }).success,
    ).toBe(false);
    expect(
      noteRelationSchema.safeParse({
        ...base,
        noteAId: firstNoteId,
        noteBId: firstNoteId,
      }).success,
    ).toBe(false);
  });
});
