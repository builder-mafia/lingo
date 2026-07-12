import { describe, expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const validProblem = {
  question: "고객 문제를 검증하기 위한 가장 적절한 첫 행동은 무엇인가요?",
  choices: [
    {
      order: 1,
      option: "기능을 모두 구현한다",
      explanation: "고객 문제를 검증하기 전 구현부터 시작하면 불필요한 기능을 만들 위험이 큽니다.",
    },
    {
      order: 2,
      option: "잠재 고객과 인터뷰한다",
      explanation: "정답입니다. 고객의 현재 행동과 문제를 확인해 가설을 검증할 수 있습니다.",
    },
  ],
  correctId: 2,
};

describe("lingo problem multiple-choice validate", () => {
  test("validates inline JSON and returns the normalized problem", async () => {
    const process = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "problem",
        "multiple-choice",
        "validate",
        "--data",
        JSON.stringify(validProblem),
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
    expect(JSON.parse(stdout)).toEqual({
      ok: true,
      data: validProblem,
    });
  });
});
