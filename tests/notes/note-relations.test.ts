import { Database as SqliteDatabase } from "bun:sqlite";
import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

test("stores canonical relations, hides trashed notes, and cascades permanent deletion", async () => {
  const databasePath = `/tmp/lingo-relations-${crypto.randomUUID()}.sqlite`;
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const first = yield* database.createNote({
          title: "Effect",
          labels: ["TypeScript"],
        });
        const second = yield* database.createNote({
          title: "Fiber",
          labels: ["Concurrency"],
        });

        const created = yield* database.addNoteRelation(second.id, first.id);
        const duplicate = yield* database.addNoteRelation(first.id, second.id);
        const beforeTrash = yield* database.listNoteRelations(first.id);
        yield* database.trashNote(second.id);
        const whileTrashed = yield* database.listNoteRelations(first.id);
        yield* database.restoreNote(second.id);
        const afterRestore = yield* database.listNoteRelations(first.id);
        yield* database.trashNote(second.id);
        yield* database.permanentlyDeleteNote(second.id);

        return {
          first,
          second,
          created,
          duplicate,
          beforeTrash,
          whileTrashed,
          afterRestore,
        };
      }),
    );

    expect([result.created.noteAId, result.created.noteBId]).toEqual(
      [result.first.id, result.second.id].sort(),
    );
    expect(result.duplicate).toEqual(result.created);
    expect(result.beforeTrash).toEqual({
      noteId: result.first.id,
      relations: [
        {
          relation: result.created,
          note: {
            id: result.second.id,
            title: "Fiber",
            labels: ["Concurrency"],
          },
        },
      ],
    });
    expect(result.whileTrashed).toEqual({
      noteId: result.first.id,
      relations: [],
    });
    expect(result.afterRestore).toEqual(result.beforeTrash);

    const database = new SqliteDatabase(databasePath);
    try {
      expect(
        database
          .query<{ readonly count: number }, []>(
            "SELECT COUNT(*) AS count FROM note_relations",
          )
          .get(),
      ).toEqual({ count: 0 });
    } finally {
      database.close();
    }
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});

test("rejects self relations and relations to missing or trashed notes", async () => {
  const databasePath = `/tmp/lingo-relation-errors-${crypto.randomUUID()}.sqlite`;
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const errors = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const first = yield* database.createNote({
          title: "첫 노트",
          labels: [],
        });
        const second = yield* database.createNote({
          title: "둘째 노트",
          labels: [],
        });
        yield* database.trashNote(second.id);

        const self = yield* Effect.flip(database.addNoteRelation(first.id, first.id));
        const trashed = yield* Effect.flip(database.addNoteRelation(first.id, second.id));
        const missing = yield* Effect.flip(
          database.addNoteRelation(first.id, crypto.randomUUID()),
        );

        return { self, trashed, missing };
      }),
    );

    expect(errors.self.message).toBe("Could not add note relation.");
    expect(errors.trashed.message).toBe("Could not add note relation.");
    expect(errors.missing.message).toBe("Could not add note relation.");
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
