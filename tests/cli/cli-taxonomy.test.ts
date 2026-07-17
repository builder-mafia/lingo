import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const run = async (home: string, args: readonly string[]) => {
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

test("adds a multiple-choice question with the concise question add command", async () => {
  const home = `/tmp/lingo-cli-taxonomy-${crypto.randomUUID()}`;
  const note = JSON.parse((await run(home, ["note", "create"])).stdout).data;
  const result = await run(home, ["question", "add", note.noteId, "--data", JSON.stringify({ question: "질문", choices: [{ order: 1, option: "가", explanation: "설명" }, { order: 2, option: "나", explanation: "설명" }], correctId: 1 })]);

  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout).data).toMatchObject({
    noteId: note.noteId,
    questionId: expect.any(String),
    correctId: 1,
  });
});

test("rejects the removed problem add command", async () => {
  const home = `/tmp/lingo-legacy-problem-${crypto.randomUUID()}`;
  const note = JSON.parse((await run(home, ["note", "create"])).stdout).data;
  const { exitCode, stderr } = await run(home, [
    "problem",
    "add",
    note.noteId,
    "--data",
    '{"question":"질문","referenceAnswer":"답"}',
  ]);

  expect(exitCode).toBe(1);
  expect(JSON.parse(stderr).error.code).toBe("CliError");
});

test("rejects the removed answer subjective set command", async () => {
  const child = Bun.spawn(
    ["bun", "run", cliPath, "answer", "subjective", "set", crypto.randomUUID(), "--data", '{"content":"답변"}'],
    { cwd: projectRoot, stdout: "pipe", stderr: "pipe" },
  );
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(exitCode).toBe(1);
  expect(JSON.parse(stderr).error.code).toBe("CliError");
});
