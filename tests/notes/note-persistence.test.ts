import { rmSync } from "node:fs";
import { Effect, Layer, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { createNote } from "../../src/cli/commands/create-note";
import { Database, makeDatabaseLayer } from "../../src/layers/database";

const tempDatabasePath = () =>
  `/tmp/lingo-note-${crypto.randomUUID()}.sqlite`;

test("creates a note in SQLite and returns its localhost URL", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(
    Layer.mergeAll(makeDatabaseLayer(databasePath)),
  );

  try {
    const created = await runtime.runPromise(createNote());
    const stored = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        return yield* database.findNote(created.noteId);
      }),
    );

    expect(created.noteUrl).toBe(
      `http://127.0.0.1:4312/notes/${created.noteId}`,
    );
    expect(stored).toEqual({
      id: created.noteId,
      createdAt: created.createdAt,
    });
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
