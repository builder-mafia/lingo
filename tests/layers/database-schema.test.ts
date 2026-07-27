import { Database as SqliteDatabase } from "bun:sqlite";
import { expect, test } from "bun:test";

import { initializeDatabaseSchema } from "../../src/layers/database";

test("database schema enforces note content foreign keys", () => {
  const database = new SqliteDatabase(":memory:");

  try {
    initializeDatabaseSchema(database);

    expect(
      database.query<{ readonly foreign_keys: number }, []>("PRAGMA foreign_keys").get(),
    ).toEqual({ foreign_keys: 1 });
    expect(() =>
      database
        .query(
          "INSERT INTO note_contents (note_id, content, updated_at) VALUES (?, ?, ?)",
        )
        .run(
          "f26a9922-c4a0-4de0-90fa-1e1a6cc46405",
          "orphan content",
          "2026-07-12T00:00:00.000Z",
        ),
    ).toThrow();
  } finally {
    database.close();
  }
});
