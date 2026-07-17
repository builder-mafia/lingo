import { Database as SqliteDatabase } from "bun:sqlite";
import { Context, Effect, Layer } from "effect";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { CliError } from "../cli/errors";
import {
  noteSchema,
  type CreateNote,
  type Note,
} from "../schemas/note";
import { noteSummarySchema, type NoteSummary } from "../schemas/note-summary";
import { type CreateMultipleChoiceQuestion } from "../schemas/multiple-choice";
import { type CreateSubjectiveQuestion } from "../schemas/subjective";
import { runDatabaseMigrations } from "./database-migrations";

export type StoredMultipleChoiceQuestion = {
  readonly questionId: string;
  readonly noteId: string;
  readonly correctId: number;
};

export type StoredSubjectiveQuestion = {
  readonly questionId: string;
  readonly noteId: string;
};

export type UnevaluatedSubjectiveAnswer = {
  readonly questionId: string;
  readonly question: string;
  readonly referenceAnswer: string;
  readonly answer: string;
};

export interface DatabaseService {
  readonly createNote: (input: CreateNote) => Effect.Effect<Note, CliError>;
  readonly findNote: (noteId: string) => Effect.Effect<Note | undefined, CliError>;
  readonly setNoteSummary: (
    noteId: string,
    content: string,
  ) => Effect.Effect<NoteSummary, CliError>;
  readonly findNoteSummary: (
    noteId: string,
  ) => Effect.Effect<NoteSummary | undefined, CliError>;
  readonly addMultipleChoiceQuestion: (
    noteId: string,
    question: CreateMultipleChoiceQuestion,
  ) => Effect.Effect<StoredMultipleChoiceQuestion, CliError>;
  readonly addSubjectiveQuestion: (
    noteId: string,
    question: CreateSubjectiveQuestion,
  ) => Effect.Effect<StoredSubjectiveQuestion, CliError>;
  readonly setSubjectiveAnswer: (
    questionId: string,
    content: string,
  ) => Effect.Effect<{ readonly questionId: string; readonly content: string }, CliError>;
  readonly listUnevaluatedSubjectiveAnswers: (
    noteId: string,
  ) => Effect.Effect<readonly UnevaluatedSubjectiveAnswer[], CliError>;
  readonly setSubjectiveEvaluation: (
    questionId: string,
    feedback: string,
  ) => Effect.Effect<{ readonly questionId: string; readonly feedback: string }, CliError>;
}

export class Database extends Context.Tag("@lingo/Database")<
  Database,
  DatabaseService
>() {}

type NoteRow = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
};

type NoteLabelRow = {
  readonly label: string;
};

type NoteSummaryRow = {
  readonly noteId: string;
  readonly content: string;
  readonly updatedAt: string;
};

export const initializeDatabaseSchema = (database: SqliteDatabase) => {
  database.run("PRAGMA foreign_keys = ON");
  runDatabaseMigrations(database);
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
  createNote: (input) =>
    withDatabase(
      databasePath,
      (database) => {
        const note = noteSchema.parse({
          id: crypto.randomUUID(),
          title: input.title,
          labels: input.labels,
          createdAt: new Date().toISOString(),
        });

        const insertNote = database.query(
          "INSERT INTO notes (id, title, created_at) VALUES (?, ?, ?)",
        );
        const insertLabel = database.query(
          "INSERT INTO note_labels (note_id, label, position) VALUES (?, ?, ?)",
        );

        database.transaction(() => {
          insertNote.run(note.id, note.title, note.createdAt);
          note.labels.forEach((label, position) => {
            insertLabel.run(note.id, label, position);
          });
        })();

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
            "SELECT id, title, created_at AS createdAt FROM notes WHERE id = ?",
          )
          .get(noteId);

        if (!row) {
          return undefined;
        }

        const labels = database
          .query<NoteLabelRow, [string]>(
            "SELECT label FROM note_labels WHERE note_id = ? ORDER BY position",
          )
          .all(noteId)
          .map(({ label }) => label);

        return noteSchema.parse({ ...row, labels });
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
  addMultipleChoiceQuestion: (noteId, question) =>
    withDatabase(
      databasePath,
      (database) => {
        const stored: StoredMultipleChoiceQuestion = {
          questionId: crypto.randomUUID(),
          noteId,
          correctId: question.correctId,
        };
        const insertQuestion = database.query(
          "INSERT INTO multiple_choice_questions (id, note_id, question, correct_choice_order, created_at) VALUES (?, ?, ?, ?, ?)",
        );
        const insertChoice = database.query(
          "INSERT INTO multiple_choice_choices (question_id, choice_order, option, explanation) VALUES (?, ?, ?, ?)",
        );
        database.transaction(() => {
          insertQuestion.run(
            stored.questionId,
            noteId,
            question.question,
            question.correctId,
            new Date().toISOString(),
          );
          for (const choice of question.choices) {
            insertChoice.run(
              stored.questionId,
              choice.order,
              choice.option,
              choice.explanation,
            );
          }
        })();

        return stored;
      },
      "Could not add multiple-choice question.",
    ),
  addSubjectiveQuestion: (noteId, question) =>
    withDatabase(
      databasePath,
      (database) => {
        const stored: StoredSubjectiveQuestion = { questionId: crypto.randomUUID(), noteId };
        database
          .query(
            "INSERT INTO subjective_questions (id, note_id, question, reference_answer, created_at) VALUES (?, ?, ?, ?, ?)",
          )
          .run(stored.questionId, noteId, question.question, question.referenceAnswer, new Date().toISOString());
        return stored;
      },
      "Could not add subjective question.",
    ),
  setSubjectiveAnswer: (questionId, content) =>
    withDatabase(
      databasePath,
      (database) => {
        database.query(`
          INSERT INTO subjective_answers (question_id, content, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
        `).run(questionId, content, new Date().toISOString());
        return { questionId, content };
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
              questions.id AS questionId,
              questions.question AS question,
              questions.reference_answer AS referenceAnswer,
              answers.content AS answer
            FROM subjective_questions AS questions
            INNER JOIN subjective_answers AS answers ON answers.question_id = questions.id
            LEFT JOIN subjective_evaluations AS evaluations ON evaluations.question_id = questions.id
            WHERE questions.note_id = ? AND evaluations.question_id IS NULL
            ORDER BY questions.created_at ASC
          `)
          .all(noteId),
      "Could not list subjective answers.",
    ),
  setSubjectiveEvaluation: (questionId, feedback) =>
    withDatabase(
      databasePath,
      (database) => {
        database.query(`
          INSERT INTO subjective_evaluations (question_id, feedback, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(question_id) DO UPDATE SET feedback = excluded.feedback, updated_at = excluded.updated_at
        `).run(questionId, feedback, new Date().toISOString());
        return { questionId, feedback };
      },
      "Could not set subjective evaluation.",
    ),
});

export const makeDatabaseLayer = (databasePath: string) =>
  Layer.succeed(Database, makeService(databasePath));
