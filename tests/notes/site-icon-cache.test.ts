import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

test("stores one site icon result per origin and lists source origins", async () => {
  const databasePath = `/tmp/lingo-site-icons-${crypto.randomUUID()}.sqlite`;
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({ title: "Effect", labels: [] });
        yield* database.addNoteSource(note.id, {
          title: "Effect docs",
          url: "https://effect.website/docs/getting-started/",
        });
        yield* database.setNoteContent(
          note.id,
          "본문\n\n## Sources\n\n- [TypeScript](https://www.typescriptlang.org/docs/) — Handbook",
        );

        const checkedAt = "2026-08-02T00:00:00.000Z";
        yield* database.storeSiteIconCache({
          origin: "https://effect.website",
          mimeType: "image/png",
          data: new Uint8Array([137, 80, 78, 71]),
          checkedAt,
        });
        yield* database.storeSiteIconCache({
          origin: "https://www.typescriptlang.org",
          mimeType: null,
          data: null,
          checkedAt,
        });

        return {
          origins: yield* database.listSourceOrigins(),
          icon: yield* database.findSiteIconCache("https://effect.website"),
          missing: yield* database.findSiteIconCache(
            "https://www.typescriptlang.org",
          ),
        };
      }),
    );

    expect(result.origins).toEqual([
      "https://effect.website",
      "https://www.typescriptlang.org",
    ]);
    expect(result.icon).toMatchObject({
      origin: "https://effect.website",
      mimeType: "image/png",
      checkedAt: "2026-08-02T00:00:00.000Z",
    });
    expect([...result.icon!.data!]).toEqual([137, 80, 78, 71]);
    expect(result.missing).toEqual({
      origin: "https://www.typescriptlang.org",
      mimeType: null,
      data: null,
      checkedAt: "2026-08-02T00:00:00.000Z",
    });
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
