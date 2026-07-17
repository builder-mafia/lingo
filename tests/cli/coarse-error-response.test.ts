import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("returns a coarse CLI error without raw Zod issues", async () => {
  const home = `/tmp/lingo-coarse-error-${crypto.randomUUID()}`;
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
      JSON.stringify({
        question: "질문",
        choices: [
          { order: 1, option: "A", explanation: "정답입니다." },
          { order: 2, option: "B", explanation: "오답입니다." },
        ],
        correctId: 3,
      }),
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
  const response = JSON.parse(stderr);

  expect(exitCode).toBe(1);
  expect(response).toEqual({
    ok: false,
    error: {
      code: "CliError",
      message: "Invalid question.",
      details: [],
    },
  });
});
