import { Database as SqliteDatabase } from "bun:sqlite";
import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;
const runCli = async (home: string, args: readonly string[]) => {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], { cwd: projectRoot, env: { ...process.env, HOME: home }, stdout: "pipe" });
  const [exitCode, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
  return { exitCode, stdout };
};

test("stores and updates an evaluation for a subjective problem", async () => {
  const home = `/tmp/lingo-evaluation-${crypto.randomUUID()}`;
  try {
    const note = JSON.parse((await runCli(home, ["note", "create"])).stdout).data;
    const problem = JSON.parse((await runCli(home, ["note", "problem", "subjective", "add", note.noteId, "--data", JSON.stringify({ question: "설명", referenceAnswer: "모범" })])).stdout).data;
    await runCli(home, ["answer", "subjective", "set", problem.problemId, "--data", JSON.stringify({ content: "답변" })]);
    const first = await runCli(home, ["evaluation", "set", problem.problemId, "--data", JSON.stringify({ feedback: "근거가 부족합니다." })]);
    const second = await runCli(home, ["evaluation", "set", problem.problemId, "--data", JSON.stringify({ feedback: "근거가 충분합니다." })]);
    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try { expect(database.query<{ readonly feedback: string }, [string]>("SELECT feedback FROM subjective_evaluations WHERE problem_id = ?").get(problem.problemId)).toEqual({ feedback: "근거가 충분합니다." }); }
    finally { database.close(); }
  } finally { rmSync(home, { recursive: true, force: true }); }
});
