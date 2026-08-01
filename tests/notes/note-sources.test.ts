import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

test("stores ordered note sources and exposes them in the overview", async () => {
  const databasePath = `/tmp/lingo-sources-${crypto.randomUUID()}.sqlite`;
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({ title: "Effect", labels: [] });
        const first = yield* database.addNoteSource(note.id, {
          title: "Effect documentation",
          url: "https://effect.website/docs/error-management/",
          description: "Error handling semantics checked for this note.",
        });
        const second = yield* database.addNoteSource(note.id, {
          title: "TypeScript handbook",
          url: "https://www.typescriptlang.org/docs/handbook/intro.html",
        });
        const updated = yield* database.addNoteSource(note.id, {
          title: "Effect error management",
          url: first.url,
          description: "Updated reference scope.",
        });
        const sources = yield* database.listNoteSources(note.id);
        const overview = yield* database.findNoteOverview(note.id);
        yield* database.removeNoteSource(second.id);
        const afterRemove = yield* database.listNoteSources(note.id);

        return { note, first, second, updated, sources, overview, afterRemove };
      }),
    );

    expect(result.updated).toMatchObject({
      id: result.first.id,
      position: 1,
      title: "Effect error management",
      description: "Updated reference scope.",
    });
    expect(result.sources).toEqual({
      noteId: result.note.id,
      sources: [result.updated, result.second],
    });
    expect(result.overview?.sources).toEqual([result.updated, result.second]);
    expect(result.afterRemove).toEqual({
      noteId: result.note.id,
      sources: [result.updated],
    });
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
