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
import { noteStatusSchema, type NoteStatus } from "../schemas/note-status";
import {
  noteWorkspaceItemSchema,
  workspacePromptSchema,
  type NoteWorkspaceItem,
  type WorkspacePrompt,
} from "../schemas/note-workspace";
import {
  noteOverviewSchema,
  questionSessionSchema,
  type NoteOverview,
  type QuestionSession,
} from "../schemas/question-session";
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
  readonly listNoteWorkspace: () => Effect.Effect<
    readonly NoteWorkspaceItem[],
    CliError
  >;
  readonly setNoteStatus: (
    noteId: string,
    status: NoteStatus,
  ) => Effect.Effect<
    { readonly noteId: string; readonly status: NoteStatus },
    CliError
  >;
  readonly trashNote: (
    noteId: string,
  ) => Effect.Effect<{ readonly noteId: string; readonly trashed: true }, CliError>;
  readonly listWorkspacePrompts: () => Effect.Effect<
    readonly WorkspacePrompt[],
    CliError
  >;
  readonly findNoteOverview: (
    noteId: string,
  ) => Effect.Effect<NoteOverview | undefined, CliError>;
  readonly findQuestionSession: (
    questionId: string,
  ) => Effect.Effect<QuestionSession | undefined, CliError>;
  readonly setMultipleChoiceAnswer: (
    questionId: string,
    selectedId: number,
  ) => Effect.Effect<
    {
      readonly questionId: string;
      readonly selectedId: number;
      readonly correct: boolean;
    },
    CliError
  >;
  readonly resolveQuestion: (
    questionId: string,
  ) => Effect.Effect<
    { readonly questionId: string; readonly resolved: true },
    CliError
  >;
  readonly reopenQuestion: (
    questionId: string,
  ) => Effect.Effect<
    { readonly questionId: string; readonly resolved: false },
    CliError
  >;
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

type NoteWorkspaceRow = {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly status: string;
  readonly openQuestionCount: number;
  readonly updatedAt: string;
};

type WorkspacePromptRow = {
  readonly questionId: string;
  readonly noteId: string;
  readonly noteTitle: string;
  readonly question: string;
  readonly kind: string;
  readonly activityAt: string;
};

type NoteOverviewRow = {
  readonly id: string;
  readonly title: string;
  readonly summary: string | null;
  readonly status: string;
};

type NoteQuestionRow = {
  readonly id: string;
  readonly kind: string;
  readonly question: string;
  readonly resolvedAt: string | null;
  readonly hasAnswer: number;
  readonly hasFeedback: number;
};

type QuestionSessionRow = {
  readonly kind: string;
  readonly questionId: string;
  readonly noteId: string;
  readonly noteTitle: string;
  readonly summary: string | null;
  readonly question: string;
  readonly answer: string | null;
  readonly feedback: string | null;
  readonly resolvedAt: string | null;
};

type MultipleChoiceQuestionSessionRow = {
  readonly correctId: number;
  readonly kind: string;
  readonly noteId: string;
  readonly noteTitle: string;
  readonly question: string;
  readonly questionId: string;
  readonly resolvedAt: string | null;
  readonly selectedId: number | null;
  readonly summary: string | null;
};

type MultipleChoiceChoiceRow = {
  readonly explanation: string;
  readonly option: string;
  readonly order: number;
};

type StoredQuestionKind = "multiple_choice" | "subjective";

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

const findStoredQuestionKind = (
  database: SqliteDatabase,
  questionId: string,
) =>
  database
    .query<{ readonly kind: StoredQuestionKind }, [string, string]>(`
      SELECT kind
      FROM (
        SELECT 'subjective' AS kind
        FROM subjective_questions AS questions
        INNER JOIN notes ON notes.id = questions.note_id
        WHERE questions.id = ? AND notes.deleted_at IS NULL

        UNION ALL

        SELECT 'multiple_choice' AS kind
        FROM multiple_choice_questions AS questions
        INNER JOIN notes ON notes.id = questions.note_id
        WHERE questions.id = ? AND notes.deleted_at IS NULL
      )
    `)
    .get(questionId, questionId)?.kind;

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
        const updatedAt = new Date().toISOString();
        database.transaction(() => {
          database
            .query(
              "DELETE FROM subjective_evaluations WHERE question_id = ?",
            )
            .run(questionId);
          database.query(`
            INSERT INTO subjective_answers (question_id, content, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(question_id) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
          `).run(questionId, content, updatedAt);
          database.query(`
            UPDATE notes
            SET status = 'in_progress'
            WHERE
              status = 'not_started'
              AND id = (
                SELECT note_id FROM subjective_questions WHERE id = ?
              )
          `).run(questionId);
        })();
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
  listNoteWorkspace: () =>
    withDatabase(
      databasePath,
      (database) => {
        const rows = database
          .query<NoteWorkspaceRow, []>(`
            SELECT
              notes.id,
              notes.title,
              summaries.content AS summary,
              notes.status,
              (
                SELECT COUNT(*)
                FROM subjective_questions
                WHERE note_id = notes.id AND resolved_at IS NULL
              ) + (
                SELECT COUNT(*)
                FROM multiple_choice_questions
                WHERE note_id = notes.id AND resolved_at IS NULL
              ) AS openQuestionCount,
              MAX(
                notes.created_at,
                COALESCE(summaries.updated_at, notes.created_at),
                COALESCE((
                  SELECT MAX(created_at)
                  FROM subjective_questions
                  WHERE note_id = notes.id
                ), notes.created_at),
                COALESCE((
                  SELECT MAX(created_at)
                  FROM multiple_choice_questions
                  WHERE note_id = notes.id
                ), notes.created_at),
                COALESCE((
                  SELECT MAX(answers.updated_at)
                  FROM subjective_answers AS answers
                  INNER JOIN subjective_questions AS questions
                    ON questions.id = answers.question_id
                  WHERE questions.note_id = notes.id
                ), notes.created_at),
                COALESCE((
                  SELECT MAX(evaluations.updated_at)
                  FROM subjective_evaluations AS evaluations
                  INNER JOIN subjective_questions AS questions
                    ON questions.id = evaluations.question_id
                  WHERE questions.note_id = notes.id
                ), notes.created_at),
                COALESCE((
                  SELECT MAX(answers.answered_at)
                  FROM multiple_choice_answers AS answers
                  INNER JOIN multiple_choice_questions AS questions
                    ON questions.id = answers.question_id
                  WHERE questions.note_id = notes.id
                ), notes.created_at)
              ) AS updatedAt
            FROM notes
            LEFT JOIN note_summaries AS summaries ON summaries.note_id = notes.id
            WHERE notes.deleted_at IS NULL
            ORDER BY updatedAt DESC, notes.created_at DESC
          `)
          .all();

        const labelQuery = database.query<NoteLabelRow, [string]>(
          "SELECT label FROM note_labels WHERE note_id = ? ORDER BY position",
        );

        return rows.map((row) =>
          noteWorkspaceItemSchema.parse({
            ...row,
            labels: labelQuery.all(row.id).map(({ label }) => label),
          }),
        );
      },
      "Could not list notes.",
    ),
  setNoteStatus: (noteId, status) =>
    withDatabase(
      databasePath,
      (database) => {
        database
          .query(
            "UPDATE notes SET status = ? WHERE id = ? AND deleted_at IS NULL",
          )
          .run(status, noteId);
        const updated = database
          .query<{ readonly status: string }, [string]>(
            "SELECT status FROM notes WHERE id = ? AND deleted_at IS NULL",
          )
          .get(noteId);

        if (!updated) {
          throw new Error("Note not found.");
        }

        return { noteId, status: noteStatusSchema.parse(updated.status) };
      },
      "Could not update note status.",
    ),
  trashNote: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        database
          .query(
            "UPDATE notes SET deleted_at = COALESCE(deleted_at, ?) WHERE id = ?",
          )
          .run(new Date().toISOString(), noteId);
        const trashed = database
          .query<{ readonly deletedAt: string | null }, [string]>(
            "SELECT deleted_at AS deletedAt FROM notes WHERE id = ?",
          )
          .get(noteId);

        if (!trashed?.deletedAt) {
          throw new Error("Note not found.");
        }

        return { noteId, trashed: true as const };
      },
      "Could not move note to trash.",
    ),
  listWorkspacePrompts: () =>
    withDatabase(
      databasePath,
      (database) =>
        database
          .query<WorkspacePromptRow, []>(`
            SELECT * FROM (
              SELECT
                questions.id AS questionId,
                notes.id AS noteId,
                notes.title AS noteTitle,
                questions.question,
                'feedback_ready' AS kind,
                evaluations.updated_at AS activityAt
              FROM subjective_questions AS questions
              INNER JOIN notes ON notes.id = questions.note_id
              INNER JOIN subjective_evaluations AS evaluations
                ON evaluations.question_id = questions.id
              WHERE
                questions.resolved_at IS NULL
                AND notes.status IN ('not_started', 'in_progress')
                AND notes.deleted_at IS NULL

              UNION ALL

              SELECT
                questions.id AS questionId,
                notes.id AS noteId,
                notes.title AS noteTitle,
                questions.question,
                'unanswered' AS kind,
                questions.created_at AS activityAt
              FROM subjective_questions AS questions
              INNER JOIN notes ON notes.id = questions.note_id
              LEFT JOIN subjective_answers AS answers
                ON answers.question_id = questions.id
              WHERE
                questions.resolved_at IS NULL
                AND answers.question_id IS NULL
                AND notes.status IN ('not_started', 'in_progress')
                AND notes.deleted_at IS NULL

              UNION ALL

              SELECT
                questions.id AS questionId,
                notes.id AS noteId,
                notes.title AS noteTitle,
                questions.question,
                'multiple_choice' AS kind,
                COALESCE(answers.answered_at, questions.created_at) AS activityAt
              FROM multiple_choice_questions AS questions
              INNER JOIN notes ON notes.id = questions.note_id
              LEFT JOIN multiple_choice_answers AS answers
                ON answers.question_id = questions.id
              WHERE
                questions.resolved_at IS NULL
                AND notes.status IN ('not_started', 'in_progress')
                AND notes.deleted_at IS NULL
            )
            ORDER BY activityAt DESC
            LIMIT 3
          `)
          .all()
          .map((row) => workspacePromptSchema.parse(row)),
      "Could not list questions.",
    ),
  findNoteOverview: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        const note = database
          .query<NoteOverviewRow, [string]>(`
            SELECT
              notes.id,
              notes.title,
              summaries.content AS summary,
              notes.status
            FROM notes
            LEFT JOIN note_summaries AS summaries ON summaries.note_id = notes.id
            WHERE notes.id = ? AND notes.deleted_at IS NULL
          `)
          .get(noteId);

        if (!note) return undefined;

        const labels = database
          .query<NoteLabelRow, [string]>(
            "SELECT label FROM note_labels WHERE note_id = ? ORDER BY position",
          )
          .all(noteId)
          .map(({ label }) => label);
        const questions = database
          .query<NoteQuestionRow, [string, string]>(`
            SELECT id, kind, question, resolvedAt, hasAnswer, hasFeedback
            FROM (
              SELECT
                questions.id,
                'subjective' AS kind,
                questions.question,
                questions.resolved_at AS resolvedAt,
                CASE WHEN answers.question_id IS NULL THEN 0 ELSE 1 END AS hasAnswer,
                CASE WHEN evaluations.question_id IS NULL THEN 0 ELSE 1 END AS hasFeedback,
                questions.created_at AS createdAt
              FROM subjective_questions AS questions
              LEFT JOIN subjective_answers AS answers ON answers.question_id = questions.id
              LEFT JOIN subjective_evaluations AS evaluations ON evaluations.question_id = questions.id
              WHERE questions.note_id = ?

              UNION ALL

              SELECT
                questions.id,
                'multiple_choice' AS kind,
                questions.question,
                questions.resolved_at AS resolvedAt,
                CASE WHEN answers.question_id IS NULL THEN 0 ELSE 1 END AS hasAnswer,
                CASE WHEN answers.question_id IS NULL THEN 0 ELSE 1 END AS hasFeedback,
                questions.created_at AS createdAt
              FROM multiple_choice_questions AS questions
              LEFT JOIN multiple_choice_answers AS answers ON answers.question_id = questions.id
              WHERE questions.note_id = ?
            )
            ORDER BY createdAt DESC
          `)
          .all(noteId, noteId)
          .map((question) => ({
            ...question,
            hasAnswer: question.hasAnswer === 1,
            hasFeedback: question.hasFeedback === 1,
          }));

        return noteOverviewSchema.parse({ ...note, labels, questions });
      },
      "Could not read note overview.",
    ),
  findQuestionSession: (questionId) =>
    withDatabase(
      databasePath,
      (database) => {
        const subjective = database
          .query<QuestionSessionRow, [string]>(`
            SELECT
              'subjective' AS kind,
              questions.id AS questionId,
              notes.id AS noteId,
              notes.title AS noteTitle,
              summaries.content AS summary,
              questions.question,
              answers.content AS answer,
              evaluations.feedback,
              questions.resolved_at AS resolvedAt
            FROM subjective_questions AS questions
            INNER JOIN notes ON notes.id = questions.note_id
            LEFT JOIN note_summaries AS summaries ON summaries.note_id = notes.id
            LEFT JOIN subjective_answers AS answers ON answers.question_id = questions.id
            LEFT JOIN subjective_evaluations AS evaluations ON evaluations.question_id = questions.id
            WHERE questions.id = ? AND notes.deleted_at IS NULL
          `)
          .get(questionId);

        if (subjective) {
          return questionSessionSchema.parse(subjective);
        }

        const multipleChoice = database
          .query<MultipleChoiceQuestionSessionRow, [string]>(`
            SELECT
              'multiple_choice' AS kind,
              questions.id AS questionId,
              notes.id AS noteId,
              notes.title AS noteTitle,
              summaries.content AS summary,
              questions.question,
              questions.correct_choice_order AS correctId,
              answers.choice_order AS selectedId,
              questions.resolved_at AS resolvedAt
            FROM multiple_choice_questions AS questions
            INNER JOIN notes ON notes.id = questions.note_id
            LEFT JOIN note_summaries AS summaries ON summaries.note_id = notes.id
            LEFT JOIN multiple_choice_answers AS answers
              ON answers.question_id = questions.id
            WHERE questions.id = ? AND notes.deleted_at IS NULL
          `)
          .get(questionId);

        if (!multipleChoice) {
          return undefined;
        }

        const choices = database
          .query<MultipleChoiceChoiceRow, [string]>(`
            SELECT
              choice_order AS "order",
              option,
              explanation
            FROM multiple_choice_choices
            WHERE question_id = ?
            ORDER BY choice_order
          `)
          .all(questionId);

        return questionSessionSchema.parse({ ...multipleChoice, choices });
      },
      "Could not read question.",
    ),
  setMultipleChoiceAnswer: (questionId, selectedId) =>
    withDatabase(
      databasePath,
      (database) => {
        const question = database
          .query<
            { readonly correctId: number; readonly noteId: string },
            [string]
          >(`
            SELECT
              questions.correct_choice_order AS correctId,
              questions.note_id AS noteId
            FROM multiple_choice_questions AS questions
            INNER JOIN notes ON notes.id = questions.note_id
            WHERE questions.id = ? AND notes.deleted_at IS NULL
          `)
          .get(questionId);
        const choice = database
          .query<{ readonly choiceOrder: number }, [string, number]>(`
            SELECT choice_order AS choiceOrder
            FROM multiple_choice_choices
            WHERE question_id = ? AND choice_order = ?
          `)
          .get(questionId, selectedId);

        if (!question || !choice) {
          throw new Error("Multiple-choice question or choice not found.");
        }

        database.transaction(() => {
          database.query(`
            INSERT INTO multiple_choice_answers (question_id, choice_order, answered_at)
            VALUES (?, ?, ?)
            ON CONFLICT(question_id) DO UPDATE SET
              choice_order = excluded.choice_order,
              answered_at = excluded.answered_at
          `).run(questionId, selectedId, new Date().toISOString());
          database.query(`
            UPDATE notes
            SET status = 'in_progress'
            WHERE id = ? AND status = 'not_started'
          `).run(question.noteId);
        })();

        return {
          questionId,
          selectedId,
          correct: selectedId === question.correctId,
        };
      },
      "Could not set multiple-choice answer.",
    ),
  resolveQuestion: (questionId) =>
    withDatabase(
      databasePath,
      (database) => {
        const kind = findStoredQuestionKind(database, questionId);
        if (!kind) throw new Error("Question not found.");

        const resolvedAt = new Date().toISOString();
        if (kind === "subjective") {
          database
            .query(
              "UPDATE subjective_questions SET resolved_at = ? WHERE id = ?",
            )
            .run(resolvedAt, questionId);
        } else {
          database
            .query(
              "UPDATE multiple_choice_questions SET resolved_at = ? WHERE id = ?",
            )
            .run(resolvedAt, questionId);
        }
        return { questionId, resolved: true as const };
      },
      "Could not resolve question.",
    ),
  reopenQuestion: (questionId) =>
    withDatabase(
      databasePath,
      (database) => {
        const kind = findStoredQuestionKind(database, questionId);
        if (!kind) throw new Error("Question not found.");

        if (kind === "subjective") {
          database
            .query(
              "UPDATE subjective_questions SET resolved_at = NULL WHERE id = ?",
            )
            .run(questionId);
        } else {
          database
            .query(
              "UPDATE multiple_choice_questions SET resolved_at = NULL WHERE id = ?",
            )
            .run(questionId);
        }
        return { questionId, resolved: false as const };
      },
      "Could not reopen question.",
    ),
});

export const makeDatabaseLayer = (databasePath: string) =>
  Layer.succeed(Database, makeService(databasePath));
