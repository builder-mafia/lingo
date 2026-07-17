import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const question = JSON.stringify({
  question: "질문",
  choices: [
    { order: 1, option: "A", explanation: "정답입니다." },
    { order: 2, option: "B", explanation: "오답입니다." },
  ],
  correctId: 1,
});

test("rejects duplicate structured input flags instead of silently choosing one", async () => {
  const home = `/tmp/lingo-duplicate-input-${crypto.randomUUID()}`;
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
      "--data",
      question,
      "--data",
      question,
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, HOME: home },
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);

  expect(exitCode).toBe(1);
  expect(stderr).toContain("--data can only be provided once");
});
