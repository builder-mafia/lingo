import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;
const validProblem = JSON.stringify({
  question: "데이터베이스 없이 검증할 수 있나요?",
  choices: [
    { order: 1, option: "예", explanation: "정답입니다." },
    { order: 2, option: "아니요", explanation: "오답입니다." },
  ],
  correctId: 1,
});

const runWithUnavailableHome = (args: readonly string[]) =>
  Bun.spawn(["bun", "run", cliPath, ...args], {
    cwd: projectRoot,
    env: { ...process.env, HOME: "/dev/null" },
    stdout: "pipe",
    stderr: "pipe",
  });

test("runs a non-database command when local database initialization is unavailable", async () => {
  const child = runWithUnavailableHome([
    "problem",
    "multiple-choice",
    "validate",
    "--data",
    validProblem,
  ]);
  const [exitCode, stdout] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
  ]);

  expect(exitCode).toBe(0);
  expect(JSON.parse(stdout).ok).toBe(true);
});

test("returns a JSON CLI error when note database initialization fails", async () => {
  const child = runWithUnavailableHome(["note", "create"]);
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);

  expect(exitCode).toBe(1);
  expect(JSON.parse(stderr)).toEqual({
    ok: false,
    error: {
      code: "CliError",
      message: "Could not initialize local database.",
      details: [],
    },
  });
});
