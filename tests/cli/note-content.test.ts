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

test("sets, replaces, and reads note content through the CLI", async () => {
  const home = `/tmp/lingo-content-${crypto.randomUUID()}`;

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
      "content",
      "set",
      noteId,
      "--data",
      JSON.stringify({ content: "처음 내용" }),
    ]);
    const second = await runCli(home, [
      "note",
      "content",
      "set",
      noteId,
      "--data",
      JSON.stringify({ content: "## 갱신한 내용" }),
    ]);
    const read = await runCli(home, ["note", "content", "get", noteId]);

    expect(first.exitCode).toBe(0);
    expect(JSON.parse(first.stdout).data.content).toBe("처음 내용");
    expect(second.exitCode).toBe(0);
    expect(JSON.parse(second.stdout).data).toMatchObject({
      noteId,
      content: "## 갱신한 내용",
    });
    expect(read.exitCode).toBe(0);
    expect(JSON.parse(read.stdout).data).toMatchObject({
      noteId,
      content: "## 갱신한 내용",
    });

    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try {
      expect(
        database
          .query<{ readonly content: string }, [string]>(
            "SELECT content FROM note_contents WHERE note_id = ?",
          )
          .get(noteId),
      ).toEqual({ content: "## 갱신한 내용" });
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
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("removes the old note summary command", async () => {
  const home = `/tmp/lingo-content-command-${crypto.randomUUID()}`;

  try {
    const result = await runCli(home, [
      "note",
      "summary",
      "set",
      crypto.randomUUID(),
      "--data",
      JSON.stringify({ content: "예전 명령" }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr).error.message).toBe("Unknown command.");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("returns a structured error when note content cannot be read", async () => {
  const home = `/tmp/lingo-content-missing-${crypto.randomUUID()}`;

  try {
    const result = await runCli(home, [
      "note",
      "content",
      "get",
      crypto.randomUUID(),
    ]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        code: "CliError",
        message: "Could not read note content.",
        details: [],
      },
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("loads note content from a JSON file", async () => {
  const home = `/tmp/lingo-content-file-${crypto.randomUUID()}`;
  const dataFile = `/tmp/lingo-content-${crypto.randomUUID()}.json`;

  try {
    await Bun.write(dataFile, JSON.stringify({ content: "파일로 쓴 내용" }));
    const created = await runCli(home, [
      "note",
      "create",
      "--data",
      JSON.stringify({ title: "테스트 노트" }),
    ]);
    const noteId = JSON.parse(created.stdout).data.noteId;
    const result = await runCli(home, [
      "note",
      "content",
      "set",
      noteId,
      "--data-file",
      dataFile,
    ]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).data.content).toBe("파일로 쓴 내용");
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(dataFile, { force: true });
  }
});

test("returns a structured error when note content cannot be stored", async () => {
  const home = `/tmp/lingo-content-set-missing-${crypto.randomUUID()}`;

  try {
    const result = await runCli(home, [
      "note",
      "content",
      "set",
      crypto.randomUUID(),
      "--data",
      JSON.stringify({ content: "저장할 수 없는 내용" }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        code: "CliError",
        message: "Could not set note content.",
        details: [],
      },
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
