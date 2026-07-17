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
  test("initializes a new database at the latest schema version", () => {
    const database = new SqliteDatabase(":memory:");

    try {
      initializeDatabaseSchema(database);

      expect(readDatabaseVersion(database)).toBe(LATEST_DATABASE_VERSION);
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
          .query<{ readonly id: string }, [string]>(
            "SELECT id FROM notes WHERE id = ?",
          )
          .get(noteId),
      ).toEqual({ id: noteId });
      expect(
        database
          .query<{ readonly name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'subjective_evaluations'",
          )
          .get(),
      ).toEqual({ name: "subjective_evaluations" });
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
});
