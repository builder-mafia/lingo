import { Context, Effect, Layer, Scope } from "effect";

import { CliError } from "../cli/errors";

export type LocalHttpServerConfig = {
  readonly hostname: "127.0.0.1";
  readonly port: number;
};

export type LocalHttpServerAddress = {
  readonly serverUrl: string;
};

export interface LocalHttpServerService {
  readonly listen: Effect.Effect<
    LocalHttpServerAddress,
    CliError,
    Scope.Scope
  >;
}

export class LocalHttpServer extends Context.Tag("@lingo/LocalHttpServer")<
  LocalHttpServer,
  LocalHttpServerService
>() {}

const handleRequest = (request: Request) => {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return Response.json({ ok: true, data: { status: "ready" } });
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: "NotFound",
        message: "Route not found.",
        details: [],
      },
    },
    { status: 404 },
  );
};

const makeService = (
  config: LocalHttpServerConfig,
): LocalHttpServerService => ({
  listen: Effect.acquireRelease(
    Effect.try({
      try: () => {
        if (
          !Number.isInteger(config.port) ||
          config.port < 1 ||
          config.port > 65_535
        ) {
          throw new Error("Invalid local server port.");
        }

        return Bun.serve({
          hostname: config.hostname,
          port: config.port,
          fetch: handleRequest,
        });
      },
      catch: () => new CliError("Could not start local server."),
    }),
    (server) =>
      Effect.promise(() => Promise.resolve(server.stop(true))).pipe(
        Effect.orDie,
      ),
  ).pipe(
    Effect.map((server) => ({
      serverUrl: `http://${config.hostname}:${server.port}`,
    })),
  ),
});

export const makeLocalHttpServerLayer = (config: LocalHttpServerConfig) =>
  Layer.succeed(LocalHttpServer, makeService(config));
