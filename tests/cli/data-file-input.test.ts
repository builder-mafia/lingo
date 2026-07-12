import { describe, expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const validProblem = {
  question: "좋은 객관식 문제의 조건은 무엇인가요?",
  choices: [
    {
      order: 10,
      option: "정답이 존재한다",
      explanation: "정답입니다. 객관식 문제는 선택지 중 판별 가능한 정답이 필요합니다.",
    },
    {
      order: 20,
      option: "선택지가 하나뿐이다",
      explanation: "오답입니다. 객관식은 최소 두 개의 선택지를 통해 판단을 요구합니다.",
    },
  ],
  correctId: 10,
};

describe("lingo --data-file input", () => {
  test("loads and validates JSON from a file", async () => {
    const filePath = `/tmp/lingo-problem-${crypto.randomUUID()}.json`;
    await Bun.write(filePath, JSON.stringify(validProblem));

    const process = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "problem",
        "multiple-choice",
        "validate",
        "--data-file",
        filePath,
      ],
      { cwd: projectRoot, stdout: "pipe", stderr: "pipe" },
    );

    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual({ ok: true, data: validProblem });
  });
});
