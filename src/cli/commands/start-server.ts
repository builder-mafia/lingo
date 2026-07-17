import { Effect } from "effect";

import { LocalHttpServer } from "../../layers/local-http-server";
import { CliError } from "../errors";

export const startServer = (): Effect.Effect<
  never,
  CliError,
  LocalHttpServer
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const server = yield* LocalHttpServer;
      const address = yield* server.listen;

      console.log(JSON.stringify({ ok: true, data: address }));
      return yield* Effect.never;
    }),
  );
