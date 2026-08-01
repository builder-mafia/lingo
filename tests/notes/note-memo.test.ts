import { Database as SqliteDatabase } from "bun:sqlite";
import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

test("stores one memo per note, clears blank text, and removes it with the note", async () => {
  const databasePath = `/tmp/lingo-memo-${crypto.randomUUID()}.sqlite`;
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({
          title: "Effect 실험",
          labels: ["TypeScript"],
        });
        const empty = yield* database.findNoteMemo(note.id);
        const first = yield* database.setNoteMemo(
          note.id,
          "  fiber 취소 시점을 확인해보기  ",
        );
        yield* Effect.sleep("2 millis");
        const second = yield* database.setNoteMemo(
          note.id,
          "새로운 상황에서 interruption을 다시 실험한다.",
        );
        const overview = yield* database.findNoteOverview(note.id);
        const workspace = yield* database.listNoteWorkspace();
        const cleared = yield* database.setNoteMemo(note.id, " \n ");
        const afterClear = yield* database.findNoteMemo(note.id);
        yield* database.setNoteMemo(note.id, "삭제될 메모");
        yield* database.trashNote(note.id);
        yield* database.permanentlyDeleteNote(note.id);

        return {
          note,
          empty,
          first,
          second,
          overview,
          workspace,
          cleared,
          afterClear,
        };
      }),
    );

    expect(result.empty).toEqual({ noteId: result.note.id, memo: null });
    expect(result.first.memo).toMatchObject({
      noteId: result.note.id,
      content: "  fiber 취소 시점을 확인해보기  ",
    });
    expect(result.second.memo).toMatchObject({
      id: result.first.memo?.id,
      createdAt: result.first.memo?.createdAt,
      content: "새로운 상황에서 interruption을 다시 실험한다.",
    });
    expect(result.overview?.memo).toEqual(result.second.memo);
    if (!result.second.memo) throw new Error("Expected the memo to be stored.");
    expect(result.workspace[0]?.updatedAt).toBe(result.second.memo.updatedAt);
    expect(result.cleared).toEqual({ noteId: result.note.id, memo: null });
    expect(result.afterClear).toEqual({ noteId: result.note.id, memo: null });

    const database = new SqliteDatabase(databasePath);
    try {
      expect(
        database
          .query<{ readonly count: number }, []>(
            "SELECT COUNT(*) AS count FROM note_memos",
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
