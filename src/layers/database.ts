import { Database as SqliteDatabase } from "bun:sqlite";
import { Context, Effect, Layer } from "effect";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { CliError } from "../cli/errors";
import { noteSchema, type Note } from "../schemas/note";

export interface DatabaseService {
  readonly createNote: () => Effect.Effect<Note, CliError>;
  readonly findNote: (noteId: string) => Effect.Effect<Note | undefined, CliError>;
}

export class Database extends Context.Tag("@lingo/Database")<
  Database,
  DatabaseService
>() {}

type NoteRow = {
  readonly id: string;
  readonly createdAt: string;
};

const initializeDatabase = (databasePath: string) => {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new SqliteDatabase(databasePath, { create: true });

  database.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  return database;
};

const withDatabase = <Result>(
  databasePath: string,
  operation: (database: SqliteDatabase) => Result,
  failureMessage: string,
): Effect.Effect<Result, CliError> =>
  Effect.try({
    try: () => initializeDatabase(databasePath),
    catch: () => new CliError("Could not initialize local database."),
  }).pipe(
    Effect.flatMap((database) =>
      Effect.try({
        try: () => {
          try {
            return operation(database);
          } finally {
            database.close();
          }
        },
        catch: () => new CliError(failureMessage),
      }),
    ),
  );

const makeService = (databasePath: string): DatabaseService => ({
  createNote: () =>
    withDatabase(
      databasePath,
      (database) => {
        const note = noteSchema.parse({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        });

        database
          .query("INSERT INTO notes (id, created_at) VALUES (?, ?)")
          .run(note.id, note.createdAt);

        return note;
      },
      "Could not create note.",
    ),
  findNote: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        const row = database
          .query<NoteRow, [string]>(
            "SELECT id, created_at AS createdAt FROM notes WHERE id = ?",
          )
          .get(noteId);

        return row ? noteSchema.parse(row) : undefined;
      },
      "Could not read note.",
    ),
});

export const makeDatabaseLayer = (databasePath: string) =>
  Layer.succeed(Database, makeService(databasePath));
