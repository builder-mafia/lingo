import { Database as SqliteDatabase } from "bun:sqlite";
import { existsSync, rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const tempHome = () => `/tmp/lingo-home-${crypto.randomUUID()}`;

test("lingo note create persists a note in the default local database", async () => {
  const home = tempHome();
  const child = Bun.spawn(
    [
      "bun",
      "run",
      cliPath,
      "note",
      "create",
      "--data",
      JSON.stringify({
        title: "  Effect 오류 모델  ",
        labels: [" TypeScript ", "Effect", "TypeScript"],
      }),
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, HOME: home },
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  try {
    const [exitCode, stdout] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
    ]);
    const response = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(response.ok).toBe(true);
    expect(response.data.id).toBeUndefined();
    expect(response.data.title).toBe("Effect 오류 모델");
    expect(response.data.labels).toEqual(["TypeScript", "Effect"]);
    expect(response.data.noteUrl).toBe(
      `http://127.0.0.1:4312/notes/${response.data.noteId}`,
    );
    const databasePath = `${home}/.lingo/lingo.sqlite`;
    expect(existsSync(databasePath)).toBe(true);

    const database = new SqliteDatabase(databasePath);
    try {
      expect(
        database
          .query<{ readonly title: string }, [string]>(
            "SELECT title FROM notes WHERE id = ?",
          )
          .get(response.data.noteId),
      ).toEqual({ title: "Effect 오류 모델" });
      expect(
        database
          .query<
            { readonly label: string; readonly position: number },
            [string]
          >(
            "SELECT label, position FROM note_labels WHERE note_id = ? ORDER BY position",
          )
          .all(response.data.noteId),
      ).toEqual([
        { label: "TypeScript", position: 0 },
        { label: "Effect", position: 1 },
      ]);
    } finally {
      database.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("lingo note create requires structured metadata input", async () => {
  const home = tempHome();
  const child = Bun.spawn(["bun", "run", cliPath, "note", "create"], {
    cwd: projectRoot,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  });

  try {
    const [exitCode, stderr] = await Promise.all([
      child.exited,
      new Response(child.stderr).text(),
    ]);

    expect(exitCode).toBe(1);
    expect(JSON.parse(stderr)).toEqual({
      ok: false,
      error: {
        code: "CliError",
        message: "Either --data or --data-file is required.",
        details: [],
      },
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
