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

test("loads note summary content from a JSON file", async () => {
  const home = `/tmp/lingo-summary-file-${crypto.randomUUID()}`;
  const dataFile = `/tmp/lingo-summary-${crypto.randomUUID()}.json`;

  try {
    await Bun.write(dataFile, JSON.stringify({ content: "파일 요약" }));
    const created = await runCli(home, [
      "note",
      "create",
      "--data",
      JSON.stringify({ title: "테스트 노트" }),
    ]);
    const noteId = JSON.parse(created.stdout).data.noteId;
    const result = await runCli(home, [
      "note",
      "summary",
      "set",
      noteId,
      "--data-file",
      dataFile,
    ]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).data.content).toBe("파일 요약");
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(dataFile, { force: true });
  }
});

test("returns a structured error for a missing note", async () => {
  const home = `/tmp/lingo-summary-missing-${crypto.randomUUID()}`;

  try {
    const result = await runCli(home, [
      "note",
      "summary",
      "set",
      "f26a9922-c4a0-4de0-90fa-1e1a6cc46405",
      "--data",
      JSON.stringify({ content: "저장될 수 없는 요약" }),
    ]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stderr)).toEqual({
      ok: false,
      error: {
        code: "CliError",
        message: "Could not set note summary.",
        details: [],
      },
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
