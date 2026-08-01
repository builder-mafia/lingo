import { Database as SqliteDatabase } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import {
  LATEST_DATABASE_VERSION,
  runDatabaseMigrations,
  type DatabaseMigration,
} from "../../src/layers/database-migrations";
import { initializeDatabaseSchema } from "../../src/layers/database";

const readDatabaseVersion = (database: SqliteDatabase) =>
  database
    .query<{ readonly user_version: number }, []>("PRAGMA user_version")
    .get()?.user_version;

describe("database migrations", () => {
  test("renames note summaries to contents without losing stored text", () => {
    const database = new SqliteDatabase(":memory:");
    const noteId = "ba6ff1df-6c59-4c27-a371-2fc445e643e5";

    try {
      database.run("PRAGMA foreign_keys = ON");
      database.run(`
        CREATE TABLE notes (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          deleted_at TEXT,
          created_at TEXT NOT NULL
        )
      `);
      database.run(`
        CREATE TABLE note_summaries (
          note_id TEXT PRIMARY KEY NOT NULL,
          content TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(note_id) REFERENCES notes(id)
        )
      `);
      database
        .query(
          "INSERT INTO notes (id, title, status, created_at) VALUES (?, ?, ?, ?)",
        )
        .run(noteId, "기존 노트", "not_started", "2026-07-01T00:00:00.000Z");
      database
        .query(
          "INSERT INTO note_summaries (note_id, content, updated_at) VALUES (?, ?, ?)",
        )
        .run(noteId, "보존할 기존 내용", "2026-07-01T00:00:00.000Z");
      database.run("PRAGMA user_version = 6");

      runDatabaseMigrations(database);

      expect(
        database
          .query<{ readonly content: string }, [string]>(
            "SELECT content FROM note_contents WHERE note_id = ?",
          )
          .get(noteId),
      ).toEqual({ content: "보존할 기존 내용" });
      expect(
        database
          .query<{ readonly name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'note_summaries'",
          )
          .get(),
      ).toBeNull();
    } finally {
      database.close();
    }
  });

  test("initializes a new database at the latest schema version", () => {
    const database = new SqliteDatabase(":memory:");

    try {
      initializeDatabaseSchema(database);

      expect(readDatabaseVersion(database)).toBe(LATEST_DATABASE_VERSION);
    } finally {
      database.close();
    }
  });

  test("adds one cascading memo row per note", () => {
    const database = new SqliteDatabase(":memory:");
    const noteId = "25aa185c-76c3-48ca-8e98-4b984242defc";

    try {
      initializeDatabaseSchema(database);
      expect(readDatabaseVersion(database)).toBe(9);
      database
        .query("INSERT INTO notes (id, title, created_at) VALUES (?, ?, ?)")
        .run(noteId, "메모가 있는 노트", "2026-08-01T00:00:00.000Z");
      database
        .query(
          "INSERT INTO note_memos (id, note_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          crypto.randomUUID(),
          noteId,
          "남겨둘 생각",
          "2026-08-01T00:00:00.000Z",
          "2026-08-01T00:00:00.000Z",
        );

      expect(() =>
        database
          .query(
            "INSERT INTO note_memos (id, note_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          )
          .run(
            crypto.randomUUID(),
            noteId,
            "두 번째 메모",
            "2026-08-01T00:00:00.000Z",
            "2026-08-01T00:00:00.000Z",
          ),
      ).toThrow();

      database.query("DELETE FROM notes WHERE id = ?").run(noteId);
      expect(
        database
          .query<{ readonly count: number }, []>(
            "SELECT COUNT(*) AS count FROM note_memos",
          )
          .get(),
      ).toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });

  test("upgrades an unversioned database without losing existing data", () => {
    const database = new SqliteDatabase(":memory:");
    const noteId = "c30d9828-4ea7-441f-bf02-94e5c18ec655";

    try {
      database.run(`
        CREATE TABLE notes (
          id TEXT PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      database
        .query("INSERT INTO notes (id, created_at) VALUES (?, ?)")
        .run(noteId, "2026-07-17T00:00:00.000Z");

      initializeDatabaseSchema(database);

      expect(readDatabaseVersion(database)).toBe(LATEST_DATABASE_VERSION);
      expect(
        database
          .query<
            {
              readonly deletedAt: string | null;
              readonly id: string;
              readonly status: string;
              readonly title: string;
            },
            [string]
          >(
            "SELECT id, title, status, deleted_at AS deletedAt FROM notes WHERE id = ?",
          )
          .get(noteId),
      ).toEqual({
        deletedAt: null,
        id: noteId,
        title: "제목 없는 노트",
        status: "not_started",
      });
      expect(
        database
          .query<{ readonly name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'subjective_evaluations'",
          )
          .get(),
      ).toEqual({ name: "subjective_evaluations" });
      expect(
        database
          .query<{ readonly name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'multiple_choice_answers'",
          )
          .get(),
      ).toEqual({ name: "multiple_choice_answers" });
    } finally {
      database.close();
    }
  });

  test("adds workflow state and resolvable questions without losing data", () => {
    const database = new SqliteDatabase(":memory:");
    const noteId = "e849132a-606f-4097-9396-2362ea8a2706";
    const questionId = "d3a8b147-6b9e-4ea7-9167-91d7bb38cc87";

    try {
      initializeDatabaseSchema(database);
      database
        .query("INSERT INTO notes (id, title, created_at) VALUES (?, ?, ?)")
        .run(noteId, "분산 락", "2026-07-18T00:00:00.000Z");
      database
        .query(
          "INSERT INTO subjective_questions (id, note_id, question, reference_answer, created_at) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          questionId,
          noteId,
          "락 소유권은 어떻게 검증할까?",
          "토큰을 비교한다.",
          "2026-07-18T00:00:00.000Z",
        );

      expect(
        database
          .query<{ readonly status: string }, [string]>(
            "SELECT status FROM notes WHERE id = ?",
          )
          .get(noteId),
      ).toEqual({ status: "not_started" });
      expect(
        database
          .query<{ readonly resolvedAt: string | null }, [string]>(
            "SELECT resolved_at AS resolvedAt FROM subjective_questions WHERE id = ?",
          )
          .get(questionId),
      ).toEqual({ resolvedAt: null });
    } finally {
      database.close();
    }
  });

  test("runs each migration only once", () => {
    const database = new SqliteDatabase(":memory:");
    const migrations: readonly DatabaseMigration[] = [
      {
        version: 1,
        migrate: (target) => {
          target.run("CREATE TABLE migration_marker (value TEXT NOT NULL)");
          target.run("INSERT INTO migration_marker (value) VALUES ('applied')");
        },
      },
    ];

    try {
      runDatabaseMigrations(database, migrations);
      runDatabaseMigrations(database, migrations);

      expect(
        database
          .query<{ readonly count: number }, []>(
            "SELECT COUNT(*) AS count FROM migration_marker",
          )
          .get(),
      ).toEqual({ count: 1 });
    } finally {
      database.close();
    }
  });

  test("rolls back a failed migration", () => {
    const database = new SqliteDatabase(":memory:");
    const migrations: readonly DatabaseMigration[] = [
      {
        version: 1,
        migrate: (target) => {
          target.run("CREATE TABLE should_rollback (id TEXT NOT NULL)");
          throw new Error("migration failed");
        },
      },
    ];

    try {
      expect(() => runDatabaseMigrations(database, migrations)).toThrow(
        "migration failed",
      );
      expect(readDatabaseVersion(database)).toBe(0);
      expect(
        database
          .query<{ readonly name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_rollback'",
          )
          .get(),
      ).toBeNull();
    } finally {
      database.close();
    }
  });

  test("rejects a database created by a newer app version", () => {
    const database = new SqliteDatabase(":memory:");

    try {
      database.run("PRAGMA user_version = 2");

      expect(() =>
        runDatabaseMigrations(database, [
          { version: 1, migrate: () => undefined },
        ]),
      ).toThrow("Database schema version 2 is newer than supported version 1.");
    } finally {
      database.close();
    }
  });

  test("renames question storage without losing version 1 data", () => {
    const database = new SqliteDatabase(":memory:");
    const noteId = "f837b0af-0e71-445a-8ed3-ae54af96361d";
    const multipleChoiceQuestionId = "b9125414-bda5-4447-9ef6-876831647243";
    const subjectiveQuestionId = "f035d495-68a8-48cc-bc62-5f20b32fc8d8";

    try {
      database.run("PRAGMA foreign_keys = ON");
      database.run(`
        CREATE TABLE notes (
          id TEXT PRIMARY KEY NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      database.run(`
        CREATE TABLE multiple_choice_problems (
          id TEXT PRIMARY KEY NOT NULL,
          note_id TEXT NOT NULL,
          question TEXT NOT NULL,
          correct_choice_order INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(note_id) REFERENCES notes(id)
        )
      `);
      database.run(`
        CREATE TABLE multiple_choice_choices (
          problem_id TEXT NOT NULL,
          choice_order INTEGER NOT NULL,
          option TEXT NOT NULL,
          explanation TEXT NOT NULL,
          PRIMARY KEY(problem_id, choice_order),
          FOREIGN KEY(problem_id) REFERENCES multiple_choice_problems(id)
        )
      `);
      database.run(`
        CREATE TABLE subjective_problems (
          id TEXT PRIMARY KEY NOT NULL,
          note_id TEXT NOT NULL,
          question TEXT NOT NULL,
          reference_answer TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY(note_id) REFERENCES notes(id)
        )
      `);
      database.run(`
        CREATE TABLE subjective_answers (
          problem_id TEXT PRIMARY KEY NOT NULL,
          content TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(problem_id) REFERENCES subjective_problems(id)
        )
      `);
      database.run(`
        CREATE TABLE subjective_evaluations (
          problem_id TEXT PRIMARY KEY NOT NULL,
          feedback TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(problem_id) REFERENCES subjective_problems(id),
          FOREIGN KEY(problem_id) REFERENCES subjective_answers(problem_id)
        )
      `);
      database.run("PRAGMA user_version = 1");

      database
        .query("INSERT INTO notes (id, created_at) VALUES (?, ?)")
        .run(noteId, "2026-07-17T00:00:00.000Z");
      database
        .query("INSERT INTO multiple_choice_problems (id, note_id, question, correct_choice_order, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(multipleChoiceQuestionId, noteId, "객관식 질문", 1, "2026-07-17T00:00:00.000Z");
      database
        .query("INSERT INTO multiple_choice_choices (problem_id, choice_order, option, explanation) VALUES (?, ?, ?, ?)")
        .run(multipleChoiceQuestionId, 1, "선택지", "설명");
      database
        .query("INSERT INTO subjective_problems (id, note_id, question, reference_answer, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(subjectiveQuestionId, noteId, "주관식 질문", "참고 답안", "2026-07-17T00:00:00.000Z");
      database
        .query("INSERT INTO subjective_answers (problem_id, content, updated_at) VALUES (?, ?, ?)")
        .run(subjectiveQuestionId, "내 답변", "2026-07-17T00:00:00.000Z");
      database
        .query("INSERT INTO subjective_evaluations (problem_id, feedback, updated_at) VALUES (?, ?, ?)")
        .run(subjectiveQuestionId, "피드백", "2026-07-17T00:00:00.000Z");

      initializeDatabaseSchema(database);

      expect(readDatabaseVersion(database)).toBe(LATEST_DATABASE_VERSION);
      expect(
        database
          .query<{ readonly title: string }, [string]>(
            "SELECT title FROM notes WHERE id = ?",
          )
          .get(noteId),
      ).toEqual({ title: "제목 없는 노트" });
      expect(
        database
          .query<{ readonly name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'note_labels'",
          )
          .get(),
      ).toEqual({ name: "note_labels" });
      expect(
        database
          .query<{ readonly id: string }, [string]>(
            "SELECT id FROM multiple_choice_questions WHERE id = ?",
          )
          .get(multipleChoiceQuestionId),
      ).toEqual({ id: multipleChoiceQuestionId });
      expect(
        database
          .query<{ readonly questionId: string }, [string]>(
            "SELECT question_id AS questionId FROM multiple_choice_choices WHERE question_id = ?",
          )
          .get(multipleChoiceQuestionId),
      ).toEqual({ questionId: multipleChoiceQuestionId });
      expect(
        database
          .query<{ readonly questionId: string; readonly content: string }, [string]>(
            "SELECT question_id AS questionId, content FROM subjective_answers WHERE question_id = ?",
          )
          .get(subjectiveQuestionId),
      ).toEqual({ questionId: subjectiveQuestionId, content: "내 답변" });
      expect(
        database
          .query<{ readonly questionId: string; readonly feedback: string }, [string]>(
            "SELECT question_id AS questionId, feedback FROM subjective_evaluations WHERE question_id = ?",
          )
          .get(subjectiveQuestionId),
      ).toEqual({ questionId: subjectiveQuestionId, feedback: "피드백" });
      expect(database.query("PRAGMA foreign_key_check").all()).toEqual([]);
    } finally {
      database.close();
    }
  });
});
