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
import { noteContentSchema, type NoteContent } from "../schemas/note-content";
import {
  noteMemoSchema,
  noteMemoStateSchema,
  type NoteMemo,
  type NoteMemoState,
} from "../schemas/note-memo";
import {
  noteRelationListSchema,
  noteRelationSchema,
  type NoteRelation,
  type NoteRelationList,
} from "../schemas/note-relation";
import {
  noteSourceListSchema,
  noteSourceSchema,
  type CreateNoteSource,
  type NoteSource,
  type NoteSourceList,
} from "../schemas/note-source";
import { type CreateMultipleChoiceQuestion } from "../schemas/multiple-choice";
import { type CreateSubjectiveQuestion } from "../schemas/subjective";
import {
  trashedNoteSchema,
  type TrashedNote,
} from "../schemas/trashed-note";
import { noteStatusSchema, type NoteStatus } from "../schemas/note-status";
import {
  noteWorkspaceItemSchema,
  type NoteWorkspaceItem,
} from "../schemas/note-workspace";
import {
  noteOverviewSchema,
  questionSessionSchema,
  type NoteOverview,
  type QuestionSession,
} from "../schemas/question-session";
import { runDatabaseMigrations } from "./database-migrations";
import {
  createdCourseSchema,
  type CreateCourse,
  type CreatedCourse,
} from "../schemas/course";
import {
  courseOverviewSchema,
  courseNoteContextSchema,
  courseWorkspaceItemSchema,
  type CourseOverview,
  type CourseWorkspaceItem,
} from "../schemas/course-workspace";
import {
  knowledgeMapSchema,
  type KnowledgeMap,
} from "../schemas/knowledge-map";

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
  readonly createCourse: (
    input: CreateCourse,
  ) => Effect.Effect<CreatedCourse, CliError>;
  readonly listCourses: () => Effect.Effect<
    readonly CourseWorkspaceItem[],
    CliError
  >;
  readonly findCourseOverview: (
    courseId: string,
  ) => Effect.Effect<CourseOverview | undefined, CliError>;
  readonly setCourseStatus: (
    courseId: string,
    status: NoteStatus,
  ) => Effect.Effect<
    { readonly courseId: string; readonly status: NoteStatus },
    CliError
  >;
  readonly createNote: (input: CreateNote) => Effect.Effect<Note, CliError>;
  readonly findNote: (noteId: string) => Effect.Effect<Note | undefined, CliError>;
  readonly setNoteContent: (
    noteId: string,
    content: string,
  ) => Effect.Effect<NoteContent, CliError>;
  readonly findNoteContent: (
    noteId: string,
  ) => Effect.Effect<NoteContent | undefined, CliError>;
  readonly setNoteMemo: (
    noteId: string,
    content: string,
  ) => Effect.Effect<NoteMemoState, CliError>;
  readonly findNoteMemo: (
    noteId: string,
  ) => Effect.Effect<NoteMemoState, CliError>;
  readonly addNoteSource: (
    noteId: string,
    source: CreateNoteSource,
  ) => Effect.Effect<NoteSource, CliError>;
  readonly listNoteSources: (
    noteId: string,
  ) => Effect.Effect<NoteSourceList, CliError>;
  readonly removeNoteSource: (
    sourceId: string,
  ) => Effect.Effect<
    { readonly sourceId: string; readonly removed: true },
    CliError
  >;
  readonly addNoteRelation: (
    noteId: string,
    targetNoteId: string,
  ) => Effect.Effect<NoteRelation, CliError>;
  readonly listNoteRelations: (
    noteId: string,
  ) => Effect.Effect<NoteRelationList, CliError>;
  readonly removeNoteRelation: (
    relationId: string,
  ) => Effect.Effect<
    { readonly relationId: string; readonly removed: true },
    CliError
  >;
  readonly readKnowledgeMap: () => Effect.Effect<KnowledgeMap, CliError>;
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
  readonly listTrashedNotes: () => Effect.Effect<
    readonly TrashedNote[],
    CliError
  >;
  readonly restoreNote: (
    noteId: string,
  ) => Effect.Effect<{ readonly noteId: string; readonly restored: true }, CliError>;
  readonly permanentlyDeleteNote: (
    noteId: string,
  ) => Effect.Effect<{ readonly noteId: string; readonly deleted: true }, CliError>;
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

type CourseWorkspaceRow = {
  readonly id: string;
  readonly title: string;
  readonly goal: string;
  readonly status: string;
  readonly chapterCount: number;
  readonly completedChapterCount: number;
  readonly openQuestionCount: number;
  readonly createdAt: string;
  readonly currentChapterPosition: number | null;
  readonly currentChapterTitle: string | null;
};

type CourseOverviewRow = {
  readonly id: string;
  readonly title: string;
  readonly goal: string;
  readonly status: string;
  readonly createdAt: string;
};

type CourseChapterOverviewRow = {
  readonly position: number;
  readonly noteId: string;
  readonly title: string;
  readonly objective: string;
  readonly status: string;
  readonly openQuestionCount: number;
  readonly trashed: number;
};

type CourseChapterLabelRow = {
  readonly noteId: string;
  readonly label: string;
};

type CourseNoteContextRow = {
  readonly courseId: string;
  readonly courseTitle: string;
  readonly position: number;
};

type NextCourseChapterRow = {
  readonly noteId: string;
  readonly title: string;
  readonly position: number;
};

type NoteLabelRow = {
  readonly label: string;
};

type NoteContentRow = {
  readonly noteId: string;
  readonly content: string;
  readonly updatedAt: string;
};

type NoteWorkspaceRow = {
  readonly id: string;
  readonly title: string;
  readonly content: string | null;
  readonly status: string;
  readonly openQuestionCount: number;
  readonly updatedAt: string;
  readonly courseId: string | null;
  readonly courseTitle: string | null;
  readonly coursePosition: number | null;
};

type TrashedNoteRow = {
  readonly id: string;
  readonly title: string;
  readonly content: string | null;
  readonly deletedAt: string;
};

type NoteOverviewRow = {
  readonly id: string;
  readonly title: string;
  readonly content: string | null;
  readonly status: string;
};

type NoteMemoRow = {
  readonly id: string;
  readonly noteId: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type NoteSourceRow = {
  readonly id: string;
  readonly noteId: string;
  readonly title: string;
  readonly url: string;
  readonly description: string | null;
  readonly position: number;
  readonly createdAt: string;
};

type NoteRelationRow = {
  readonly id: string;
  readonly noteAId: string;
  readonly noteBId: string;
  readonly createdAt: string;
};

type RelatedNoteRow = NoteRelationRow & {
  readonly noteId: string;
  readonly title: string;
};

type KnowledgeMapNodeRow = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly courseId: string | null;
  readonly courseTitle: string | null;
  readonly coursePosition: number | null;
};

type KnowledgeMapRelationRow = {
  readonly id: string;
  readonly sourceNoteId: string;
  readonly targetNoteId: string;
};

type KnowledgeMapCourseEdgeRow = {
  readonly courseId: string;
  readonly sourcePosition: number;
  readonly sourceNoteId: string;
  readonly targetPosition: number;
  readonly targetNoteId: string;
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
  readonly content: string | null;
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
  readonly content: string | null;
};

type MultipleChoiceChoiceRow = {
  readonly explanation: string;
  readonly option: string;
  readonly order: number;
};

type NextQuestionRow = {
  readonly questionId: string;
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

const findNextUnansweredQuestionId = (
  database: SqliteDatabase,
  noteId: string,
  currentQuestionId: string,
) =>
  database
    .query<NextQuestionRow, [string, string, string, string]>(`
      SELECT questionId
      FROM (
        SELECT
          questions.id AS questionId,
          questions.created_at AS createdAt
        FROM subjective_questions AS questions
        LEFT JOIN subjective_answers AS answers
          ON answers.question_id = questions.id
        WHERE
          questions.note_id = ?
          AND questions.id != ?
          AND questions.resolved_at IS NULL
          AND answers.question_id IS NULL

        UNION ALL

        SELECT
          questions.id AS questionId,
          questions.created_at AS createdAt
        FROM multiple_choice_questions AS questions
        LEFT JOIN multiple_choice_answers AS answers
          ON answers.question_id = questions.id
        WHERE
          questions.note_id = ?
          AND questions.id != ?
          AND questions.resolved_at IS NULL
          AND answers.question_id IS NULL
      )
      ORDER BY createdAt ASC, questionId ASC
      LIMIT 1
    `)
    .get(noteId, currentQuestionId, noteId, currentQuestionId)?.questionId ??
  null;

const findCourseNoteContext = (
  database: SqliteDatabase,
  noteId: string,
) => {
  const current = database
    .query<CourseNoteContextRow, [string]>(`
      SELECT
        courses.id AS courseId,
        courses.title AS courseTitle,
        chapters.position
      FROM course_chapters AS chapters
      INNER JOIN courses ON courses.id = chapters.course_id
      WHERE chapters.note_id = ?
    `)
    .get(noteId);
  if (!current) return null;

  const nextChapter = database
    .query<NextCourseChapterRow, [string, number]>(`
      SELECT
        notes.id AS noteId,
        notes.title,
        chapters.position
      FROM course_chapters AS chapters
      INNER JOIN notes ON notes.id = chapters.note_id
      WHERE
        chapters.course_id = ?
        AND chapters.position > ?
        AND notes.deleted_at IS NULL
      ORDER BY chapters.position
      LIMIT 1
    `)
    .get(current.courseId, current.position) ?? null;

  return courseNoteContextSchema.parse({ ...current, nextChapter });
};

const permanentNoteDeleteStatements = [
  "DELETE FROM course_chapters WHERE note_id = ?",
  `
    DELETE FROM subjective_evaluations
    WHERE question_id IN (
      SELECT id FROM subjective_questions WHERE note_id = ?
    )
  `,
  `
    DELETE FROM subjective_answers
    WHERE question_id IN (
      SELECT id FROM subjective_questions WHERE note_id = ?
    )
  `,
  `
    DELETE FROM multiple_choice_answers
    WHERE question_id IN (
      SELECT id FROM multiple_choice_questions WHERE note_id = ?
    )
  `,
  `
    DELETE FROM multiple_choice_choices
    WHERE question_id IN (
      SELECT id FROM multiple_choice_questions WHERE note_id = ?
    )
  `,
  "DELETE FROM subjective_questions WHERE note_id = ?",
  "DELETE FROM multiple_choice_questions WHERE note_id = ?",
  "DELETE FROM note_memos WHERE note_id = ?",
  "DELETE FROM note_contents WHERE note_id = ?",
  "DELETE FROM note_labels WHERE note_id = ?",
  "DELETE FROM notes WHERE id = ? AND deleted_at IS NOT NULL",
] as const;

const requireActiveNote = (database: SqliteDatabase, noteId: string) => {
  const note = database
    .query<{ readonly id: string }, [string]>(
      "SELECT id FROM notes WHERE id = ? AND deleted_at IS NULL",
    )
    .get(noteId);

  if (!note) throw new Error("Note not found.");
};

const findStoredNoteMemo = (
  database: SqliteDatabase,
  noteId: string,
): NoteMemo | null => {
  const row = database
    .query<NoteMemoRow, [string]>(`
      SELECT
        id,
        note_id AS noteId,
        content,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM note_memos
      WHERE note_id = ?
    `)
    .get(noteId);

  return row ? noteMemoSchema.parse(row) : null;
};

const readNoteMemoState = (
  database: SqliteDatabase,
  noteId: string,
): NoteMemoState => {
  requireActiveNote(database, noteId);
  return noteMemoStateSchema.parse({
    noteId,
    memo: findStoredNoteMemo(database, noteId),
  });
};

const findStoredNoteSources = (
  database: SqliteDatabase,
  noteId: string,
): readonly NoteSource[] =>
  database
    .query<NoteSourceRow, [string]>(`
      SELECT
        id,
        note_id AS noteId,
        title,
        url,
        description,
        position,
        created_at AS createdAt
      FROM note_sources
      WHERE note_id = ?
      ORDER BY position
    `)
    .all(noteId)
    .map((source) => noteSourceSchema.parse(source));

const requireTrashedNote = (database: SqliteDatabase, noteId: string) => {
  const trashed = database
    .query<{ readonly id: string }, [string]>(
      "SELECT id FROM notes WHERE id = ? AND deleted_at IS NOT NULL",
    )
    .get(noteId);

  if (!trashed) {
    throw new Error("Trashed note not found.");
  }
};

const restoreTrashedNote = (database: SqliteDatabase, noteId: string) =>
  database.transaction(() => {
    requireTrashedNote(database, noteId);
    database
      .query("UPDATE notes SET deleted_at = NULL WHERE id = ?")
      .run(noteId);
  })();

const deleteTrashedNote = (database: SqliteDatabase, noteId: string) =>
  database.transaction(() => {
    requireTrashedNote(database, noteId);

    for (const statement of permanentNoteDeleteStatements) {
      database.query(statement).run(noteId);
    }
  })();

const makeService = (databasePath: string): DatabaseService => ({
  createCourse: (input) =>
    withDatabase(
      databasePath,
      (database) => {
        const createdAt = new Date().toISOString();
        const courseId = crypto.randomUUID();
        const chapters = input.chapters.map((chapter, index) => ({
          noteId: crypto.randomUUID(),
          position: index + 1,
          title: chapter.title,
          objective: chapter.objective,
          status: "not_started" as const,
          labels: chapter.labels,
        }));
        const insertCourse = database.query(
          "INSERT INTO courses (id, title, goal, status, created_at) VALUES (?, ?, ?, 'not_started', ?)",
        );
        const insertNote = database.query(
          "INSERT INTO notes (id, title, created_at) VALUES (?, ?, ?)",
        );
        const insertLabel = database.query(
          "INSERT INTO note_labels (note_id, label, position) VALUES (?, ?, ?)",
        );
        const insertChapter = database.query(
          "INSERT INTO course_chapters (course_id, note_id, position, objective) VALUES (?, ?, ?, ?)",
        );

        database.transaction(() => {
          insertCourse.run(courseId, input.title, input.goal, createdAt);
          for (const chapter of chapters) {
            insertNote.run(chapter.noteId, chapter.title, createdAt);
            chapter.labels.forEach((label, position) => {
              insertLabel.run(chapter.noteId, label, position);
            });
            insertChapter.run(
              courseId,
              chapter.noteId,
              chapter.position,
              chapter.objective,
            );
          }
        })();

        return createdCourseSchema.parse({
          courseId,
          title: input.title,
          goal: input.goal,
          status: "not_started",
          createdAt,
          chapterCount: chapters.length,
          chapters: chapters.map(({ labels: _labels, ...chapter }) => chapter),
        });
      },
      "Could not create course.",
    ),
  listCourses: () =>
    withDatabase(
      databasePath,
      (database) =>
        database
          .query<CourseWorkspaceRow, []>(`
            SELECT
              courses.id,
              courses.title,
              courses.goal,
              courses.status,
              courses.created_at AS createdAt,
              (
                SELECT candidate.position
                FROM course_chapters AS candidate
                INNER JOIN notes AS candidate_notes ON candidate_notes.id = candidate.note_id
                WHERE
                  candidate.course_id = courses.id
                  AND candidate_notes.deleted_at IS NULL
                  AND candidate_notes.status IN ('in_progress', 'not_started')
                ORDER BY
                  CASE WHEN candidate_notes.status = 'in_progress' THEN 0 ELSE 1 END,
                  candidate.position
                LIMIT 1
              ) AS currentChapterPosition,
              (
                SELECT candidate_notes.title
                FROM course_chapters AS candidate
                INNER JOIN notes AS candidate_notes ON candidate_notes.id = candidate.note_id
                WHERE
                  candidate.course_id = courses.id
                  AND candidate_notes.deleted_at IS NULL
                  AND candidate_notes.status IN ('in_progress', 'not_started')
                ORDER BY
                  CASE WHEN candidate_notes.status = 'in_progress' THEN 0 ELSE 1 END,
                  candidate.position
                LIMIT 1
              ) AS currentChapterTitle,
              COUNT(chapters.note_id) AS chapterCount,
              COALESCE(SUM(CASE
                WHEN notes.deleted_at IS NULL AND notes.status = 'completed' THEN 1
                ELSE 0
              END), 0)
                AS completedChapterCount,
              COALESCE(SUM(
                CASE WHEN notes.deleted_at IS NULL THEN
                  (SELECT COUNT(*) FROM subjective_questions
                    WHERE note_id = chapters.note_id AND resolved_at IS NULL) +
                  (SELECT COUNT(*) FROM multiple_choice_questions
                    WHERE note_id = chapters.note_id AND resolved_at IS NULL)
                ELSE 0 END
              ), 0) AS openQuestionCount
            FROM courses
            LEFT JOIN course_chapters AS chapters ON chapters.course_id = courses.id
            LEFT JOIN notes ON notes.id = chapters.note_id
            GROUP BY courses.id
            ORDER BY courses.created_at DESC
          `)
          .all()
          .map((row) =>
            courseWorkspaceItemSchema.parse({
              ...row,
              currentChapter:
                row.currentChapterPosition && row.currentChapterTitle
                  ? {
                      position: row.currentChapterPosition,
                      title: row.currentChapterTitle,
                    }
                  : null,
            }),
          ),
      "Could not list courses.",
    ),
  findCourseOverview: (courseId) =>
    withDatabase(
      databasePath,
      (database) => {
        const course = database
          .query<CourseOverviewRow, [string]>(`
            SELECT id, title, goal, status, created_at AS createdAt
            FROM courses
            WHERE id = ?
          `)
          .get(courseId);
        if (!course) return undefined;

        const chapters = database
          .query<CourseChapterOverviewRow, [string]>(`
            SELECT
              chapters.position,
              notes.id AS noteId,
              notes.title,
              chapters.objective,
              notes.status,
              (
                SELECT COUNT(*) FROM subjective_questions
                WHERE note_id = notes.id AND resolved_at IS NULL
              ) + (
                SELECT COUNT(*) FROM multiple_choice_questions
                WHERE note_id = notes.id AND resolved_at IS NULL
              ) AS openQuestionCount,
              CASE WHEN notes.deleted_at IS NULL THEN 0 ELSE 1 END AS trashed
            FROM course_chapters AS chapters
            INNER JOIN notes ON notes.id = chapters.note_id
            WHERE chapters.course_id = ?
            ORDER BY chapters.position
          `)
          .all(courseId);
        const labelRows = database
          .query<CourseChapterLabelRow, [string]>(`
            SELECT labels.note_id AS noteId, labels.label
            FROM note_labels AS labels
            INNER JOIN course_chapters AS chapters ON chapters.note_id = labels.note_id
            WHERE chapters.course_id = ?
            ORDER BY chapters.position, labels.position
          `)
          .all(courseId);
        const labelsByNote = new Map<string, string[]>();
        for (const row of labelRows) {
          const labels = labelsByNote.get(row.noteId) ?? [];
          labels.push(row.label);
          labelsByNote.set(row.noteId, labels);
        }

        return courseOverviewSchema.parse({
          ...course,
          chapters: chapters.map((chapter) => ({
            ...chapter,
            labels: labelsByNote.get(chapter.noteId) ?? [],
            trashed: chapter.trashed === 1,
          })),
        });
      },
      "Could not read course.",
    ),
  setCourseStatus: (courseId, status) =>
    withDatabase(
      databasePath,
      (database) => {
        database.query("UPDATE courses SET status = ? WHERE id = ?").run(status, courseId);
        const updated = database
          .query<{ readonly status: string }, [string]>(
            "SELECT status FROM courses WHERE id = ?",
          )
          .get(courseId);
        if (!updated) throw new Error("Course not found.");
        return { courseId, status: noteStatusSchema.parse(updated.status) };
      },
      "Could not update course status.",
    ),
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
  setNoteContent: (noteId, content) =>
    withDatabase(
      databasePath,
      (database) => {
        const stored = noteContentSchema.parse({
          noteId,
          content,
          updatedAt: new Date().toISOString(),
        });

        database
          .query(`
            INSERT INTO note_contents (note_id, content, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(note_id) DO UPDATE SET
              content = excluded.content,
              updated_at = excluded.updated_at
          `)
          .run(stored.noteId, stored.content, stored.updatedAt);

        return stored;
      },
      "Could not set note content.",
    ),
  findNoteContent: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        const row = database
          .query<NoteContentRow, [string]>(
            `
              SELECT
                note_id AS noteId,
                content,
                updated_at AS updatedAt
              FROM note_contents
              WHERE note_id = ?
            `,
          )
          .get(noteId);

        return row ? noteContentSchema.parse(row) : undefined;
      },
      "Could not read note content.",
    ),
  setNoteMemo: (noteId, content) =>
    withDatabase(
      databasePath,
      (database) => {
        requireActiveNote(database, noteId);

        if (content.trim().length === 0) {
          database
            .query("DELETE FROM note_memos WHERE note_id = ?")
            .run(noteId);
          return noteMemoStateSchema.parse({ noteId, memo: null });
        }

        const now = new Date().toISOString();
        database
          .query(`
            INSERT INTO note_memos (id, note_id, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(note_id) DO UPDATE SET
              content = excluded.content,
              updated_at = excluded.updated_at
          `)
          .run(crypto.randomUUID(), noteId, content, now, now);

        return readNoteMemoState(database, noteId);
      },
      "Could not set note memo.",
    ),
  findNoteMemo: (noteId) =>
    withDatabase(
      databasePath,
      (database) => readNoteMemoState(database, noteId),
      "Could not read note memo.",
    ),
  addNoteSource: (noteId, source) =>
    withDatabase(
      databasePath,
      (database) => {
        requireActiveNote(database, noteId);
        const now = new Date().toISOString();

        database
          .query(`
            INSERT INTO note_sources (
              id, note_id, title, url, description, position, created_at
            )
            VALUES (
              ?, ?, ?, ?, ?,
              COALESCE(
                (SELECT MAX(position) + 1 FROM note_sources WHERE note_id = ?),
                1
              ),
              ?
            )
            ON CONFLICT(note_id, url) DO UPDATE SET
              title = excluded.title,
              description = excluded.description
          `)
          .run(
            crypto.randomUUID(),
            noteId,
            source.title,
            source.url,
            source.description ?? null,
            noteId,
            now,
          );

        const stored = database
          .query<NoteSourceRow, [string, string]>(`
            SELECT
              id,
              note_id AS noteId,
              title,
              url,
              description,
              position,
              created_at AS createdAt
            FROM note_sources
            WHERE note_id = ? AND url = ?
          `)
          .get(noteId, source.url);
        if (!stored) throw new Error("Source was not stored.");
        return noteSourceSchema.parse(stored);
      },
      "Could not add note source.",
    ),
  listNoteSources: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        requireActiveNote(database, noteId);
        return noteSourceListSchema.parse({
          noteId,
          sources: findStoredNoteSources(database, noteId),
        });
      },
      "Could not list note sources.",
    ),
  removeNoteSource: (sourceId) =>
    withDatabase(
      databasePath,
      (database) => {
        const source = database
          .query<{ readonly id: string }, [string]>(
            "SELECT id FROM note_sources WHERE id = ?",
          )
          .get(sourceId);
        if (!source) throw new Error("Source not found.");

        database.query("DELETE FROM note_sources WHERE id = ?").run(sourceId);
        return { sourceId, removed: true as const };
      },
      "Could not remove note source.",
    ),
  addNoteRelation: (noteId, targetNoteId) =>
    withDatabase(
      databasePath,
      (database) => {
        if (noteId === targetNoteId) {
          throw new Error("A note cannot relate to itself.");
        }
        requireActiveNote(database, noteId);
        requireActiveNote(database, targetNoteId);

        const [noteAId, noteBId] =
          noteId < targetNoteId
            ? [noteId, targetNoteId]
            : [targetNoteId, noteId];
        const findRelation = () =>
          database
            .query<NoteRelationRow, [string, string]>(`
              SELECT
                id,
                note_a_id AS noteAId,
                note_b_id AS noteBId,
                created_at AS createdAt
              FROM note_relations
              WHERE note_a_id = ? AND note_b_id = ?
            `)
            .get(noteAId, noteBId);

        database
          .query(
            "INSERT OR IGNORE INTO note_relations (id, note_a_id, note_b_id, created_at) VALUES (?, ?, ?, ?)",
          )
          .run(
            crypto.randomUUID(),
            noteAId,
            noteBId,
            new Date().toISOString(),
          );

        const stored = findRelation();
        if (!stored) throw new Error("Relation was not stored.");
        return noteRelationSchema.parse(stored);
      },
      "Could not add note relation.",
    ),
  listNoteRelations: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        requireActiveNote(database, noteId);
        const rows = database
          .query<RelatedNoteRow, [string, string, string]>(`
            SELECT
              relations.id,
              relations.note_a_id AS noteAId,
              relations.note_b_id AS noteBId,
              relations.created_at AS createdAt,
              notes.id AS noteId,
              notes.title
            FROM note_relations AS relations
            INNER JOIN notes ON notes.id = CASE
              WHEN relations.note_a_id = ? THEN relations.note_b_id
              ELSE relations.note_a_id
            END
            WHERE
              (relations.note_a_id = ? OR relations.note_b_id = ?)
              AND notes.deleted_at IS NULL
            ORDER BY notes.title COLLATE NOCASE, relations.id
          `)
          .all(noteId, noteId, noteId);
        const labelQuery = database.query<NoteLabelRow, [string]>(
          "SELECT label FROM note_labels WHERE note_id = ? ORDER BY position",
        );

        return noteRelationListSchema.parse({
          noteId,
          relations: rows.map(
            ({ noteId: relatedNoteId, title, ...relation }) => ({
              relation,
              note: {
                id: relatedNoteId,
                title,
                labels: labelQuery
                  .all(relatedNoteId)
                  .map(({ label }) => label),
              },
            }),
          ),
        });
      },
      "Could not list note relations.",
    ),
  removeNoteRelation: (relationId) =>
    withDatabase(
      databasePath,
      (database) => {
        const relation = database
          .query<{ readonly id: string }, [string]>(
            "SELECT id FROM note_relations WHERE id = ?",
          )
          .get(relationId);
        if (!relation) throw new Error("Relation not found.");

        database.query("DELETE FROM note_relations WHERE id = ?").run(relationId);
        return { relationId, removed: true as const };
      },
      "Could not remove note relation.",
    ),
  readKnowledgeMap: () =>
    withDatabase(
      databasePath,
      (database) => {
        const nodes = database
          .query<KnowledgeMapNodeRow, []>(`
            SELECT
              notes.id,
              notes.title,
              notes.status,
              courses.id AS courseId,
              courses.title AS courseTitle,
              chapters.position AS coursePosition
            FROM notes
            LEFT JOIN course_chapters AS chapters ON chapters.note_id = notes.id
            LEFT JOIN courses ON courses.id = chapters.course_id
            WHERE notes.deleted_at IS NULL
            ORDER BY notes.title COLLATE NOCASE, notes.id
          `)
          .all();
        const labelRows = database
          .query<{ readonly noteId: string; readonly label: string }, []>(`
            SELECT labels.note_id AS noteId, labels.label
            FROM note_labels AS labels
            INNER JOIN notes ON notes.id = labels.note_id
            WHERE notes.deleted_at IS NULL
            ORDER BY labels.note_id, labels.position
          `)
          .all();
        const labelsByNote = new Map<string, string[]>();
        for (const row of labelRows) {
          const labels = labelsByNote.get(row.noteId) ?? [];
          labels.push(row.label);
          labelsByNote.set(row.noteId, labels);
        }

        const relations = database
          .query<KnowledgeMapRelationRow, []>(`
            SELECT
              relations.id,
              relations.note_a_id AS sourceNoteId,
              relations.note_b_id AS targetNoteId
            FROM note_relations AS relations
            INNER JOIN notes AS source ON source.id = relations.note_a_id
            INNER JOIN notes AS target ON target.id = relations.note_b_id
            WHERE source.deleted_at IS NULL AND target.deleted_at IS NULL
            ORDER BY relations.id
          `)
          .all()
          .map((edge) => ({ ...edge, kind: "related" as const }));
        const courseSequence = database
          .query<KnowledgeMapCourseEdgeRow, []>(`
            SELECT
              source.course_id AS courseId,
              source.position AS sourcePosition,
              source.note_id AS sourceNoteId,
              target.position AS targetPosition,
              target.note_id AS targetNoteId
            FROM course_chapters AS source
            INNER JOIN course_chapters AS target
              ON target.course_id = source.course_id
              AND target.position = source.position + 1
            INNER JOIN notes AS source_note ON source_note.id = source.note_id
            INNER JOIN notes AS target_note ON target_note.id = target.note_id
            WHERE
              source_note.deleted_at IS NULL
              AND target_note.deleted_at IS NULL
            ORDER BY source.course_id, source.position
          `)
          .all()
          .map((edge) => ({
            id: `course:${edge.courseId}:${edge.sourcePosition}:${edge.targetPosition}`,
            sourceNoteId: edge.sourceNoteId,
            targetNoteId: edge.targetNoteId,
            kind: "course_sequence" as const,
          }));

        return knowledgeMapSchema.parse({
          nodes: nodes.map((node) => ({
            id: node.id,
            title: node.title,
            labels: labelsByNote.get(node.id) ?? [],
            status: node.status,
            courseContext:
              node.courseId && node.courseTitle && node.coursePosition
                ? {
                    courseId: node.courseId,
                    courseTitle: node.courseTitle,
                    position: node.coursePosition,
                  }
                : null,
          })),
          edges: [...relations, ...courseSequence],
        });
      },
      "Could not read knowledge map.",
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
          database.query(`
            UPDATE courses
            SET status = 'in_progress'
            WHERE
              status = 'not_started'
              AND id IN (
                SELECT chapters.course_id
                FROM course_chapters AS chapters
                INNER JOIN subjective_questions AS questions
                  ON questions.note_id = chapters.note_id
                WHERE questions.id = ?
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
              contents.content AS content,
              notes.status,
              courses.id AS courseId,
              courses.title AS courseTitle,
              chapters.position AS coursePosition,
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
                COALESCE(contents.updated_at, notes.created_at),
                COALESCE((
                  SELECT memos.updated_at
                  FROM note_memos AS memos
                  WHERE memos.note_id = notes.id
                ), notes.created_at),
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
            LEFT JOIN note_contents AS contents ON contents.note_id = notes.id
            LEFT JOIN course_chapters AS chapters ON chapters.note_id = notes.id
            LEFT JOIN courses ON courses.id = chapters.course_id
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
            courseContext:
              row.courseId && row.courseTitle && row.coursePosition
                ? {
                    courseId: row.courseId,
                    courseTitle: row.courseTitle,
                    position: row.coursePosition,
                  }
                : null,
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
  listTrashedNotes: () =>
    withDatabase(
      databasePath,
      (database) => {
        const rows = database
          .query<TrashedNoteRow, []>(`
            SELECT
              notes.id,
              notes.title,
              contents.content,
              notes.deleted_at AS deletedAt
            FROM notes
            LEFT JOIN note_contents AS contents ON contents.note_id = notes.id
            WHERE notes.deleted_at IS NOT NULL
            ORDER BY notes.deleted_at DESC, notes.created_at DESC
          `)
          .all();

        return rows.map((row) => trashedNoteSchema.parse(row));
      },
      "Could not list trashed notes.",
    ),
  restoreNote: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        restoreTrashedNote(database, noteId);

        return { noteId, restored: true as const };
      },
      "Could not restore note.",
    ),
  permanentlyDeleteNote: (noteId) =>
    withDatabase(
      databasePath,
      (database) => {
        deleteTrashedNote(database, noteId);

        return { noteId, deleted: true as const };
      },
      "Could not permanently delete note.",
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
              contents.content AS content,
              notes.status
            FROM notes
            LEFT JOIN note_contents AS contents ON contents.note_id = notes.id
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

        return noteOverviewSchema.parse({
          ...note,
          labels,
          questions,
          sources: findStoredNoteSources(database, noteId),
          memo: findStoredNoteMemo(database, noteId),
          courseContext: findCourseNoteContext(database, noteId),
        });
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
              contents.content AS content,
              questions.question,
              answers.content AS answer,
              evaluations.feedback,
              questions.resolved_at AS resolvedAt
            FROM subjective_questions AS questions
            INNER JOIN notes ON notes.id = questions.note_id
            LEFT JOIN note_contents AS contents ON contents.note_id = notes.id
            LEFT JOIN subjective_answers AS answers ON answers.question_id = questions.id
            LEFT JOIN subjective_evaluations AS evaluations ON evaluations.question_id = questions.id
            WHERE questions.id = ? AND notes.deleted_at IS NULL
          `)
          .get(questionId);

        if (subjective) {
          return questionSessionSchema.parse({
            ...subjective,
            courseContext: findCourseNoteContext(database, subjective.noteId),
            nextQuestionId: findNextUnansweredQuestionId(
              database,
              subjective.noteId,
              subjective.questionId,
            ),
          });
        }

        const multipleChoice = database
          .query<MultipleChoiceQuestionSessionRow, [string]>(`
            SELECT
              'multiple_choice' AS kind,
              questions.id AS questionId,
              notes.id AS noteId,
              notes.title AS noteTitle,
              contents.content AS content,
              questions.question,
              questions.correct_choice_order AS correctId,
              answers.choice_order AS selectedId,
              questions.resolved_at AS resolvedAt
            FROM multiple_choice_questions AS questions
            INNER JOIN notes ON notes.id = questions.note_id
            LEFT JOIN note_contents AS contents ON contents.note_id = notes.id
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

        return questionSessionSchema.parse({
          ...multipleChoice,
          choices,
          courseContext: findCourseNoteContext(database, multipleChoice.noteId),
          nextQuestionId: findNextUnansweredQuestionId(
            database,
            multipleChoice.noteId,
            multipleChoice.questionId,
          ),
        });
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
          database.query(`
            UPDATE courses
            SET status = 'in_progress'
            WHERE
              status = 'not_started'
              AND id IN (
                SELECT course_id FROM course_chapters WHERE note_id = ?
              )
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
