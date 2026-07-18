import { Context, Effect, Layer, Scope } from "effect";
import { join } from "node:path";

import { CliError } from "../cli/errors";
import { makeLocalWebApp, type LocalWebAppApi } from "../server/local-web-app";
import { Database } from "./database";

export type LocalHttpServerConfig = {
  readonly hostname: "127.0.0.1";
  readonly port: number;
  readonly webRootPath: string;
  readonly requireWebAssets?: boolean;
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

const makeService = (
  config: LocalHttpServerConfig,
  api: LocalWebAppApi,
): LocalHttpServerService => ({
  listen: Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        if (
          !Number.isInteger(config.port) ||
          config.port < 1 ||
          config.port > 65_535
        ) {
          throw new Error("Invalid local server port.");
        }

        if (
          config.requireWebAssets !== false &&
          !(await Bun.file(join(config.webRootPath, "index.html")).exists())
        ) {
          throw new Error("Browser application assets were not built.");
        }

        const app = makeLocalWebApp({ webRootPath: config.webRootPath, api });
        return Bun.serve({
          hostname: config.hostname,
          port: config.port,
          fetch: app.fetch,
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
  Layer.effect(
    LocalHttpServer,
    Effect.gen(function* () {
      const database = yield* Database;
      const api: LocalWebAppApi = {
        listWorkspace: () =>
          Effect.runPromise(
            Effect.all(
              {
                notes: database.listNoteWorkspace(),
                prompts: database.listWorkspacePrompts(),
              },
              { concurrency: "unbounded" },
            ),
          ),
        setNoteStatus: (noteId, status) =>
          Effect.runPromise(database.setNoteStatus(noteId, status)),
        findNoteOverview: (noteId) =>
          Effect.runPromise(database.findNoteOverview(noteId)),
        findQuestionSession: (questionId) =>
          Effect.runPromise(database.findQuestionSession(questionId)),
        setSubjectiveAnswer: (questionId, content) =>
          Effect.runPromise(database.setSubjectiveAnswer(questionId, content)),
        resolveSubjectiveQuestion: (questionId) =>
          Effect.runPromise(database.resolveSubjectiveQuestion(questionId)),
        reopenSubjectiveQuestion: (questionId) =>
          Effect.runPromise(database.reopenSubjectiveQuestion(questionId)),
      };

      return makeService(config, api);
    }),
  );
