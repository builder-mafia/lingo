import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("rejects evaluation when a subjective question has no answer", async () => {
  const home = `/tmp/lingo-evaluation-no-answer-${crypto.randomUUID()}`;
  const run = async (args: readonly string[], stderr = false) => {
    const child = Bun.spawn(["bun", "run", cliPath, ...args], { cwd: projectRoot, env: { ...process.env, HOME: home }, stdout: "pipe", stderr: "pipe" });
    const [exitCode, output] = await Promise.all([child.exited, new Response(stderr ? child.stderr : child.stdout).text()]);
    return { exitCode, output };
  };
  try {
    const note = JSON.parse((await run(["note", "create"])).output).data;
    const question = JSON.parse((await run(["question", "add", note.noteId, "--data", JSON.stringify({ question: "질문", referenceAnswer: "모범" })])).output).data;
    const result = await run(["evaluation", "set", question.questionId, "--data", JSON.stringify({ feedback: "평가" })], true);
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.output).error.message).toBe("Could not set subjective evaluation.");
  } finally { rmSync(home, { recursive: true, force: true }); }
});
