import { rmSync } from "node:fs";
import { Effect, Layer, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";
import {
  SourceIconCache,
  makeSourceIconCacheLayer,
} from "../../src/layers/source-icon-cache";

test("fetches a favicon once, validates it, and stores it by origin", async () => {
  const databasePath = `/tmp/lingo-icon-fetch-${crypto.randomUUID()}.sqlite`;
  const DatabaseLive = makeDatabaseLayer(databasePath);
  const requests: string[] = [];
  const SourceIconCacheLive = makeSourceIconCacheLayer({
    fetch: (url) => {
      requests.push(url);
      return Promise.resolve(
        new Response(new Uint8Array([0, 0, 1, 0]), {
          headers: { "content-type": "image/x-icon" },
        }),
      );
    },
  }).pipe(Layer.provide(DatabaseLive));
  const runtime = ManagedRuntime.make(
    Layer.merge(DatabaseLive, SourceIconCacheLive),
  );

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const cache = yield* SourceIconCache;
        const database = yield* Database;
        yield* cache.cacheUrl("https://example.com/article?id=1");
        yield* cache.cacheUrl("https://example.com/another");
        return yield* database.findSiteIconCache("https://example.com");
      }),
    );

    expect(requests).toEqual(["https://example.com/favicon.ico"]);
    expect(result?.mimeType).toBe("image/x-icon");
    expect([...result!.data!]).toEqual([0, 0, 1, 0]);
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});

test("records a safe negative result without requesting private origins", async () => {
  const databasePath = `/tmp/lingo-icon-private-${crypto.randomUUID()}.sqlite`;
  const DatabaseLive = makeDatabaseLayer(databasePath);
  let requestCount = 0;
  const SourceIconCacheLive = makeSourceIconCacheLayer({
    fetch: () => {
      requestCount += 1;
      return Promise.resolve(new Response("not an image"));
    },
  }).pipe(Layer.provide(DatabaseLive));
  const runtime = ManagedRuntime.make(
    Layer.merge(DatabaseLive, SourceIconCacheLive),
  );

  try {
    await runtime.runPromise(
      Effect.gen(function* () {
        const cache = yield* SourceIconCache;
        yield* cache.cacheUrl("http://127.0.0.1/private");
        yield* cache.cacheUrl("http://localhost/private");
      }),
    );

    expect(requestCount).toBe(0);
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
