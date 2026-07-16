import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("adds a multiple-choice problem with the concise problem add command", async () => {
  const home = `/tmp/lingo-cli-taxonomy-${crypto.randomUUID()}`;
  const run = async (args: readonly string[]) => {
    const child = Bun.spawn(["bun", "run", cliPath, ...args], { cwd: projectRoot, env: { ...process.env, HOME: home }, stdout: "pipe" });
    const [exitCode, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
    return { exitCode, stdout };
  };
  const note = JSON.parse((await run(["note", "create"])).stdout).data;
  const result = await run(["problem", "add", note.noteId, "--data", JSON.stringify({ question: "질문", choices: [{ order: 1, option: "가", explanation: "설명" }, { order: 2, option: "나", explanation: "설명" }], correctId: 1 })]);
  expect(result.exitCode).toBe(0);
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
