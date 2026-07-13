import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;
const runCli = async (home: string, args: readonly string[]) => {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { cwd: projectRoot, env: { ...process.env, HOME: home }, stdout: "pipe" });
  const [exitCode, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
  return { exitCode, stdout };
};

test("lists only the selected note's unevaluated subjective answers with problem context", async () => {
  const home = `/tmp/lingo-unevaluated-${crypto.randomUUID()}`;
  try {
    const firstNote = JSON.parse((await runCli(home, ["note", "create"])).stdout).data;
    const secondNote = JSON.parse((await runCli(home, ["note", "create"])).stdout).data;
    const firstProblem = JSON.parse((await runCli(home, ["note", "problem", "subjective", "add", firstNote.noteId, "--data", JSON.stringify({ question: "첫 질문", referenceAnswer: "첫 모범답" })])).stdout).data;
    const secondProblem = JSON.parse((await runCli(home, ["note", "problem", "subjective", "add", secondNote.noteId, "--data", JSON.stringify({ question: "둘 질문", referenceAnswer: "둘 모범답" })])).stdout).data;
    await runCli(home, ["answer", "subjective", "set", firstProblem.problemId, "--data", JSON.stringify({ content: "첫 답" })]);
    await runCli(home, ["answer", "subjective", "set", secondProblem.problemId, "--data", JSON.stringify({ content: "둘 답" })]);
    const result = await runCli(home, ["answer", "list", firstNote.noteId]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).data).toEqual([{ problemId: firstProblem.problemId, question: "첫 질문", referenceAnswer: "첫 모범답", answer: "첫 답" }]);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
