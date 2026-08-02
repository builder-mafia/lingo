import { Database as SqliteDatabase } from "bun:sqlite";

export type DatabaseMigration = {
  readonly version: number;
  readonly migrate: (database: SqliteDatabase) => void;
};

const createInitialSchema = (database: SqliteDatabase) => {
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
      FOREIGN KEY(problem_id) REFERENCES subjective_problems(id),
      FOREIGN KEY(problem_id) REFERENCES subjective_answers(problem_id)
    )
  `);
};

const renameProblemsToQuestions = (database: SqliteDatabase) => {
  database.run(
    "ALTER TABLE multiple_choice_problems RENAME TO multiple_choice_questions",
  );
  database.run(
    "ALTER TABLE multiple_choice_choices RENAME COLUMN problem_id TO question_id",
  );
  database.run(
    "ALTER TABLE subjective_problems RENAME TO subjective_questions",
  );
  database.run(
    "ALTER TABLE subjective_answers RENAME COLUMN problem_id TO question_id",
  );
  database.run(
    "ALTER TABLE subjective_evaluations RENAME COLUMN problem_id TO question_id",
  );
};

const addNoteMetadata = (database: SqliteDatabase) => {
  database.run(
    "ALTER TABLE notes ADD COLUMN title TEXT NOT NULL DEFAULT '제목 없는 노트'",
  );
  database.run(`
    CREATE TABLE note_labels (
      note_id TEXT NOT NULL,
      label TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY(note_id, label),
      UNIQUE(note_id, position),
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )
  `);
};

const addWorkspaceState = (database: SqliteDatabase) => {
  database.run(`
    ALTER TABLE notes
    ADD COLUMN status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'deferred'))
  `);
  database.run(
    "ALTER TABLE multiple_choice_questions ADD COLUMN resolved_at TEXT",
  );
  database.run(
    "ALTER TABLE subjective_questions ADD COLUMN resolved_at TEXT",
  );
};

const addNoteTrash = (database: SqliteDatabase) => {
  database.run("ALTER TABLE notes ADD COLUMN deleted_at TEXT");
};

const addMultipleChoiceAnswers = (database: SqliteDatabase) => {
  database.run(`
    CREATE TABLE multiple_choice_answers (
      question_id TEXT PRIMARY KEY NOT NULL,
      choice_order INTEGER NOT NULL,
      answered_at TEXT NOT NULL,
      FOREIGN KEY(question_id) REFERENCES multiple_choice_questions(id),
      FOREIGN KEY(question_id, choice_order)
        REFERENCES multiple_choice_choices(question_id, choice_order)
    )
  `);
};

const renameNoteSummariesToContents = (database: SqliteDatabase) => {
  const legacyTable = database
    .query<{ readonly name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'note_summaries'",
    )
    .get();

  if (legacyTable) {
    database.run("ALTER TABLE note_summaries RENAME TO note_contents");
    return;
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS note_contents (
      note_id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )
  `);
};

const addCourses = (database: SqliteDatabase) => {
  database.run(`
    CREATE TABLE courses (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'deferred')),
      created_at TEXT NOT NULL
    )
  `);
  database.run(`
    CREATE TABLE course_chapters (
      course_id TEXT NOT NULL,
      note_id TEXT NOT NULL UNIQUE,
      position INTEGER NOT NULL CHECK (position > 0),
      objective TEXT NOT NULL,
      PRIMARY KEY(course_id, position),
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY(note_id) REFERENCES notes(id)
    )
  `);
};

const addNoteMemos = (database: SqliteDatabase) => {
  database.run(`
    CREATE TABLE note_memos (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `);
};

const addNoteRelations = (database: SqliteDatabase) => {
  database.run(`
    CREATE TABLE note_relations (
      id TEXT PRIMARY KEY NOT NULL,
      note_a_id TEXT NOT NULL,
      note_b_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      CHECK (note_a_id < note_b_id),
      UNIQUE (note_a_id, note_b_id),
      FOREIGN KEY(note_a_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY(note_b_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `);
  database.run(`
    CREATE INDEX note_relations_note_b_idx
    ON note_relations(note_b_id)
  `);
};

const addNoteSources = (database: SqliteDatabase) => {
  database.run(`
    CREATE TABLE note_sources (
      id TEXT PRIMARY KEY NOT NULL,
      note_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      position INTEGER NOT NULL CHECK (position > 0),
      created_at TEXT NOT NULL,
      UNIQUE(note_id, url),
      UNIQUE(note_id, position),
      FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
    )
  `);
};

const addSiteIconCache = (database: SqliteDatabase) => {
  database.run(`
    CREATE TABLE site_icon_cache (
      origin TEXT PRIMARY KEY NOT NULL,
      mime_type TEXT,
      data BLOB,
      checked_at TEXT NOT NULL,
      CHECK (
        (mime_type IS NULL AND data IS NULL) OR
        (mime_type IS NOT NULL AND data IS NOT NULL)
      )
    )
  `);
};

const databaseMigrations: readonly DatabaseMigration[] = [
  { version: 1, migrate: createInitialSchema },
  { version: 2, migrate: renameProblemsToQuestions },
  { version: 3, migrate: addNoteMetadata },
  { version: 4, migrate: addWorkspaceState },
  { version: 5, migrate: addNoteTrash },
  { version: 6, migrate: addMultipleChoiceAnswers },
  { version: 7, migrate: renameNoteSummariesToContents },
  { version: 8, migrate: addCourses },
  { version: 9, migrate: addNoteMemos },
  { version: 10, migrate: addNoteRelations },
  { version: 11, migrate: addNoteSources },
  { version: 12, migrate: addSiteIconCache },
];

export const LATEST_DATABASE_VERSION =
  databaseMigrations.at(-1)?.version ?? 0;

const readDatabaseVersion = (database: SqliteDatabase) =>
  database
    .query<{ readonly user_version: number }, []>("PRAGMA user_version")
    .get()?.user_version ?? 0;

const validateMigrations = (migrations: readonly DatabaseMigration[]) => {
  migrations.forEach((migration, index) => {
    const expectedVersion = index + 1;
    if (migration.version !== expectedVersion) {
      throw new Error(
        `Database migration version ${migration.version} must be ${expectedVersion}.`,
      );
    }
  });
};

export const runDatabaseMigrations = (
  database: SqliteDatabase,
  migrations: readonly DatabaseMigration[] = databaseMigrations,
) => {
  validateMigrations(migrations);

  const currentVersion = readDatabaseVersion(database);
  const latestVersion = migrations.at(-1)?.version ?? 0;

  if (currentVersion > latestVersion) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than supported version ${latestVersion}.`,
    );
  }

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    database.transaction(() => {
      migration.migrate(database);
      database.run(`PRAGMA user_version = ${migration.version}`);
    })();
  }
};
