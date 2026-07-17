import { describe, expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const validQuestion = {
  question: "좋은 객관식 질문의 조건은 무엇인가요?",
  choices: [
    {
      order: 10,
      option: "정답이 존재한다",
      explanation: "정답입니다. 객관식 질문은 선택지 중 판별 가능한 정답이 필요합니다.",
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
    const home = `/tmp/lingo-data-file-${crypto.randomUUID()}`;
    const filePath = `/tmp/lingo-question-${crypto.randomUUID()}.json`;
    await Bun.write(filePath, JSON.stringify(validQuestion));

    const createNote = Bun.spawn(
      ["bun", "run", cliPath, "note", "create"],
      {
        cwd: projectRoot,
        env: { ...process.env, HOME: home },
        stdout: "pipe",
      },
    );
    await createNote.exited;
    const note = JSON.parse(await new Response(createNote.stdout).text()).data;

    const child = Bun.spawn(
      [
        "bun",
        "run",
        cliPath,
        "question",
        "add",
        note.noteId,
        "--data-file",
        filePath,
      ],
      {
        cwd: projectRoot,
        env: { ...process.env, HOME: home },
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);

    expect(stderr).toBe("");
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout).data).toMatchObject({
      noteId: note.noteId,
      questionId: expect.any(String),
      correctId: validQuestion.correctId,
    });
  });
});
