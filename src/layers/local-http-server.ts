import { Context, Effect, Layer, Scope } from "effect";

import { CliError } from "../cli/errors";
import { makeLocalWebApp, type LocalWebAppApi } from "../server/local-web-app";
import type { WebAssets } from "../server/web-assets";
import { Database } from "./database";

export type LocalHttpServerConfig = {
  readonly hostname: "127.0.0.1";
  readonly port: number;
  readonly webAssets: WebAssets;
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
          !(await config.webAssets.hasIndex())
        ) {
          throw new Error("Browser application assets were not built.");
        }

        const app = makeLocalWebApp({ webAssets: config.webAssets, api });
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
        listCourses: () => Effect.runPromise(database.listCourses()),
        findCourseOverview: (courseId) =>
          Effect.runPromise(database.findCourseOverview(courseId)),
        setCourseStatus: (courseId, status) =>
          Effect.runPromise(database.setCourseStatus(courseId, status)),
        listWorkspace: () =>
          Effect.runPromise(
            database
              .listNoteWorkspace()
              .pipe(Effect.map((notes) => ({ notes }))),
          ),
        setNoteStatus: (noteId, status) =>
          Effect.runPromise(database.setNoteStatus(noteId, status)),
        trashNote: (noteId) => Effect.runPromise(database.trashNote(noteId)),
        listTrashedNotes: () =>
          Effect.runPromise(database.listTrashedNotes()),
        restoreNote: (noteId) =>
          Effect.runPromise(database.restoreNote(noteId)),
        permanentlyDeleteNote: (noteId) =>
          Effect.runPromise(database.permanentlyDeleteNote(noteId)),
        findNoteOverview: (noteId) =>
          Effect.runPromise(database.findNoteOverview(noteId)),
        findQuestionSession: (questionId) =>
          Effect.runPromise(database.findQuestionSession(questionId)),
        setSubjectiveAnswer: (questionId, content) =>
          Effect.runPromise(database.setSubjectiveAnswer(questionId, content)),
        setMultipleChoiceAnswer: (questionId, selectedId) =>
          Effect.runPromise(
            database.setMultipleChoiceAnswer(questionId, selectedId),
          ),
        resolveQuestion: (questionId) =>
          Effect.runPromise(database.resolveQuestion(questionId)),
        reopenQuestion: (questionId) =>
          Effect.runPromise(database.reopenQuestion(questionId)),
      };

      return makeService(config, api);
    }),
  );
