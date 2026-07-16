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

test("stores and updates a subjective answer", async () => {
  const home = `/tmp/lingo-answer-${crypto.randomUUID()}`;
  try {
    const note = JSON.parse((await runCli(home, ["note", "create"])).stdout).data;
    const problem = JSON.parse((await runCli(home, ["problem", "add", note.noteId, "--data", JSON.stringify({ question: "설명하세요", referenceAnswer: "모범 답안" })])).stdout).data;
    const first = await runCli(home, ["answer", "set", problem.problemId, "--data", JSON.stringify({ content: "첫 답변" })]);
    const second = await runCli(home, ["answer", "set", problem.problemId, "--data", JSON.stringify({ content: "갱신 답변" })]);
    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try {
      expect(database.query<{ readonly content: string }, [string]>("SELECT content FROM subjective_answers WHERE problem_id = ?").get(problem.problemId)).toEqual({ content: "갱신 답변" });
    } finally { database.close(); }
  } finally { rmSync(home, { recursive: true, force: true }); }
});
