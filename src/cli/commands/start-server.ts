import { Effect } from "effect";

import { LocalHttpServer } from "../../layers/local-http-server";
import { CliError } from "../errors";
import { SourceIconCache } from "../../layers/source-icon-cache";

export const startServer = (): Effect.Effect<
  never,
  CliError,
  LocalHttpServer | SourceIconCache
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const server = yield* LocalHttpServer;
      const iconCache = yield* SourceIconCache;
      yield* iconCache.cacheMissing();
      const address = yield* server.listen;

      console.log(JSON.stringify({ ok: true, data: address }));
      return yield* Effect.never;
    }),
  );
