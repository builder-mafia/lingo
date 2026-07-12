import { Database as SqliteDatabase } from "bun:sqlite";
import { Context, Effect, Layer } from "effect";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { CliError } from "../cli/errors";
import { noteSchema, type Note } from "../schemas/note";
import { noteSummarySchema, type NoteSummary } from "../schemas/note-summary";

export interface DatabaseService {
  readonly createNote: () => Effect.Effect<Note, CliError>;
  readonly findNote: (noteId: string) => Effect.Effect<Note | undefined, CliError>;
  readonly setNoteSummary: (
    noteId: string,
    content: string,
  ) => Effect.Effect<NoteSummary, CliError>;
  readonly findNoteSummary: (
    noteId: string,
  ) => Effect.Effect<NoteSummary | undefined, CliError>;
}

export class Database extends Context.Tag("@lingo/Database")<
  Database,
  DatabaseService
>() {}

type NoteRow = {
  readonly id: string;
  readonly createdAt: string;
};

type NoteSummaryRow = {
  readonly noteId: string;
  readonly content: string;
  readonly updatedAt: string;
};

export const initializeDatabaseSchema = (database: SqliteDatabase) => {
  database.run("PRAGMA foreign_keys = ON");
  database.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS note_summaries (
      note_id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )
  `);
};

const initializeDatabase = (databasePath: string) => {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new SqliteDatabase(databasePath, { create: true });

  try {
    initializeDatabaseSchema(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
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
  setNoteSummary: (noteId, content) =>
    withDatabase(
      databasePath,
      (database) => {
        const summary = noteSummarySchema.parse({
          noteId,
          content,
          updatedAt: new Date().toISOString(),
        });

        database
          .query(`
            INSERT INTO note_summaries (note_id, content, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(note_id) DO UPDATE SET
              content = excluded.content,
              updated_at = excluded.updated_at
          `)
          .run(summary.noteId, summary.content, summary.updatedAt);

        return summary;
      },
      "Could not set note summary.",
    ),
  findNoteSummary: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        const row = database
          .query<NoteSummaryRow, [string]>(
            `
              SELECT
                note_id AS noteId,
                content,
                updated_at AS updatedAt
              FROM note_summaries
              WHERE note_id = ?
            `,
          )
          .get(noteId);

        return row ? noteSummarySchema.parse(row) : undefined;
      },
      "Could not read note summary.",
    ),
});

export const makeDatabaseLayer = (databasePath: string) =>
  Layer.succeed(Database, makeService(databasePath));
