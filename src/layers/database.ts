import { Database as SqliteDatabase } from "bun:sqlite";
import { Context, Effect, Layer } from "effect";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { CliError } from "../cli/errors";
import { noteSchema, type Note } from "../schemas/note";
import { noteSummarySchema, type NoteSummary } from "../schemas/note-summary";
import { type CreateMultipleChoiceProblem } from "../schemas/multiple-choice";
import { type CreateSubjectiveProblem } from "../schemas/subjective";

export type StoredMultipleChoiceProblem = {
  readonly problemId: string;
  readonly noteId: string;
  readonly correctId: number;
};

export type StoredSubjectiveProblem = {
  readonly problemId: string;
  readonly noteId: string;
};

export type UnevaluatedSubjectiveAnswer = {
  readonly problemId: string;
  readonly question: string;
  readonly referenceAnswer: string;
  readonly answer: string;
};

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
  readonly addMultipleChoiceProblem: (
    noteId: string,
    problem: CreateMultipleChoiceProblem,
  ) => Effect.Effect<StoredMultipleChoiceProblem, CliError>;
  readonly addSubjectiveProblem: (
    noteId: string,
    problem: CreateSubjectiveProblem,
  ) => Effect.Effect<StoredSubjectiveProblem, CliError>;
  readonly setSubjectiveAnswer: (
    problemId: string,
    content: string,
  ) => Effect.Effect<{ readonly problemId: string; readonly content: string }, CliError>;
  readonly listUnevaluatedSubjectiveAnswers: (
    noteId: string,
  ) => Effect.Effect<readonly UnevaluatedSubjectiveAnswer[], CliError>;
  readonly setSubjectiveEvaluation: (
    problemId: string,
    feedback: string,
  ) => Effect.Effect<{ readonly problemId: string; readonly feedback: string }, CliError>;
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
  database.run(`
    CREATE TABLE IF NOT EXISTS multiple_choice_problems (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      question TEXT NOT NULL,
      correct_choice_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS multiple_choice_choices (
      problem_id TEXT NOT NULL,
      choice_order INTEGER NOT NULL,
      option TEXT NOT NULL,
      explanation TEXT NOT NULL,
      PRIMARY KEY(problem_id, choice_order),
      FOREIGN KEY(problem_id) REFERENCES multiple_choice_problems(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS subjective_problems (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      question TEXT NOT NULL,
      reference_answer TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS subjective_answers (
      problem_id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(problem_id) REFERENCES subjective_problems(id)
    )
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS subjective_evaluations (
      problem_id TEXT PRIMARY KEY NOT NULL,
      feedback TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(problem_id) REFERENCES subjective_problems(id)
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
  addMultipleChoiceProblem: (noteId, problem) =>
    withDatabase(
      databasePath,
      (database) => {
        const stored: StoredMultipleChoiceProblem = {
          problemId: crypto.randomUUID(),
          noteId,
          correctId: problem.correctId,
        };
        const insertProblem = database.query(
          "INSERT INTO multiple_choice_problems (id, note_id, question, correct_choice_order, created_at) VALUES (?, ?, ?, ?, ?)",
        );
        const insertChoice = database.query(
          "INSERT INTO multiple_choice_choices (problem_id, choice_order, option, explanation) VALUES (?, ?, ?, ?)",
        );
        database.transaction(() => {
          insertProblem.run(
            stored.problemId,
            noteId,
            problem.question,
            problem.correctId,
            new Date().toISOString(),
          );
          for (const choice of problem.choices) {
            insertChoice.run(
              stored.problemId,
              choice.order,
              choice.option,
              choice.explanation,
            );
          }
        })();

        return stored;
      },
      "Could not add multiple-choice problem.",
    ),
  addSubjectiveProblem: (noteId, problem) =>
    withDatabase(
      databasePath,
      (database) => {
        const stored: StoredSubjectiveProblem = { problemId: crypto.randomUUID(), noteId };
        database
          .query(
            "INSERT INTO subjective_problems (id, note_id, question, reference_answer, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .run(stored.problemId, noteId, problem.question, problem.referenceAnswer, new Date().toISOString());
        return stored;
      },
      "Could not add subjective problem.",
    ),
  setSubjectiveAnswer: (problemId, content) =>
    withDatabase(
      databasePath,
      (database) => {
        database.query(`
          INSERT INTO subjective_answers (problem_id, content, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(problem_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
        `).run(problemId, content, new Date().toISOString());
        return { problemId, content };
      },
      "Could not set subjective answer.",
    ),
  listUnevaluatedSubjectiveAnswers: (noteId) =>
    withDatabase(
      databasePath,
      (database) =>
        database
          .query<UnevaluatedSubjectiveAnswer, [string]>(`
            SELECT
              problems.id AS problemId,
              problems.question AS question,
              problems.reference_answer AS referenceAnswer,
              answers.content AS answer
            FROM subjective_problems AS problems
            INNER JOIN subjective_answers AS answers ON answers.problem_id = problems.id
            LEFT JOIN subjective_evaluations AS evaluations ON evaluations.problem_id = problems.id
            WHERE problems.note_id = ? AND evaluations.problem_id IS NULL
            ORDER BY problems.created_at ASC
          `)
          .all(noteId),
      "Could not list subjective answers.",
    ),
  setSubjectiveEvaluation: (problemId, feedback) =>
    withDatabase(
      databasePath,
      (database) => {
        database.query(`
          INSERT INTO subjective_evaluations (problem_id, feedback, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(problem_id) DO UPDATE SET feedback = excluded.feedback, updated_at = excluded.updated_at
        `).run(problemId, feedback, new Date().toISOString());
        return { problemId, feedback };
      },
      "Could not set subjective evaluation.",
    ),
});

export const makeDatabaseLayer = (databasePath: string) =>
  Layer.succeed(Database, makeService(databasePath));
