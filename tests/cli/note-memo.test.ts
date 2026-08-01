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

test("sets, reads, and clears a note memo through the CLI", async () => {
  const home = `/tmp/lingo-note-memo-${crypto.randomUUID()}`;

  try {
    const created = await runCli(home, [
      "note",
      "create",
      "--data",
      JSON.stringify({ title: "메모 테스트" }),
    ]);
    const noteId = JSON.parse(created.stdout).data.noteId;
    const empty = await runCli(home, ["note", "memo", "get", noteId]);
    const saved = await runCli(home, [
      "note",
      "memo",
      "set",
      noteId,
      "--data",
      JSON.stringify({ content: "나중에 확인할 아이디어" }),
    ]);
    const read = await runCli(home, ["note", "memo", "get", noteId]);
    const cleared = await runCli(home, [
      "note",
      "memo",
      "set",
      noteId,
      "--data",
      JSON.stringify({ content: "  " }),
    ]);

    expect(empty.exitCode).toBe(0);
    expect(JSON.parse(empty.stdout).data).toEqual({ noteId, memo: null });
    expect(saved.exitCode).toBe(0);
    expect(JSON.parse(saved.stdout).data.memo).toMatchObject({
      noteId,
      content: "나중에 확인할 아이디어",
    });
    expect(JSON.parse(read.stdout).data).toEqual(JSON.parse(saved.stdout).data);
    expect(JSON.parse(cleared.stdout).data).toEqual({ noteId, memo: null });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
