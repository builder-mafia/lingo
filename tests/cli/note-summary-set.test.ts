import { Database as SqliteDatabase } from "bun:sqlite";
import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const runCli = async (home: string, args: readonly string[]) => {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], {
    cwd: projectRoot,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
};

test("sets and updates a note summary through JSON CLI input", async () => {
  const home = `/tmp/lingo-summary-${crypto.randomUUID()}`;

  try {
    const created = await runCli(home, [
      "note",
      "create",
      "--data",
      JSON.stringify({ title: "테스트 노트" }),
    ]);
    const noteId = JSON.parse(created.stdout).data.noteId;

    const first = await runCli(home, [
      "note",
      "summary",
      "set",
      noteId,
      "--data",
      JSON.stringify({ content: "처음 요약" }),
    ]);
    const second = await runCli(home, [
      "note",
      "summary",
      "set",
      noteId,
      "--data",
      JSON.stringify({ content: "갱신된 요약" }),
    ]);

    expect(first.exitCode).toBe(0);
    expect(JSON.parse(first.stdout).data.content).toBe("처음 요약");
    expect(second.exitCode).toBe(0);
    expect(JSON.parse(second.stdout).data).toMatchObject({
      noteId,
      content: "갱신된 요약",
    });

    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try {
      const stored = database
        .query<{ readonly content: string }, [string]>(
          "SELECT content FROM note_summaries WHERE note_id = ?",
        )
        .get(noteId);
      expect(stored).toEqual({ content: "갱신된 요약" });
    } finally {
      database.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
