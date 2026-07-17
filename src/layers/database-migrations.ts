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

const databaseMigrations: readonly DatabaseMigration[] = [
  { version: 1, migrate: createInitialSchema },
  { version: 2, migrate: renameProblemsToQuestions },
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
