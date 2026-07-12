import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("returns a coarse CLI error without raw Zod issues", async () => {
  const process = Bun.spawn(
    [
      "bun",
      "run",
      cliPath,
      "problem",
      "multiple-choice",
      "validate",
      "--data",
      JSON.stringify({
        question: "질문",
        choices: [
          { order: 1, option: "A", explanation: "정답입니다." },
          { order: 2, option: "B", explanation: "오답입니다." },
        ],
        correctId: 3,
      }),
    ],
    { cwd: projectRoot, stdout: "pipe", stderr: "pipe" },
  );

  const [exitCode, stderr] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
  ]);
  const response = JSON.parse(stderr);

  expect(exitCode).toBe(1);
  expect(response).toEqual({
    ok: false,
    error: {
      code: "CliError",
      message: "Invalid multiple-choice problem.",
      details: [],
    },
  });
});
