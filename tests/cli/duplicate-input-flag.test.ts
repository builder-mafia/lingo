import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const problem = JSON.stringify({
  question: "질문",
  choices: [
    { order: 1, option: "A", explanation: "정답입니다." },
    { order: 2, option: "B", explanation: "오답입니다." },
  ],
  correctId: 1,
});

test("rejects duplicate structured input flags instead of silently choosing one", async () => {
  const process = Bun.spawn(
    [
      "bun",
      "run",
      cliPath,
      "problem",
      "multiple-choice",
      "validate",
      "--data",
      problem,
      "--data",
      problem,
    ],
    { cwd: projectRoot, stdout: "pipe", stderr: "pipe" },
  );

  const [exitCode, stderr] = await Promise.all([
    process.exited,
    new Response(process.stderr).text(),
  ]);

  expect(exitCode).toBe(1);
  expect(stderr).toContain("--data can only be provided once");
});
