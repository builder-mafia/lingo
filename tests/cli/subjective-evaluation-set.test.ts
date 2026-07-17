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

test("stores and updates an evaluation for a subjective question", async () => {
  const home = `/tmp/lingo-evaluation-${crypto.randomUUID()}`;
  try {
    const note = JSON.parse(
      (
        await runCli(home, [
          "note",
          "create",
          "--data",
          JSON.stringify({ title: "테스트 노트" }),
        ])
      ).stdout,
    ).data;
    const question = JSON.parse((await runCli(home, ["question", "add", note.noteId, "--data", JSON.stringify({ question: "설명", referenceAnswer: "모범" })])).stdout).data;
    await runCli(home, ["answer", "set", question.questionId, "--data", JSON.stringify({ content: "답변" })]);
    const first = await runCli(home, ["evaluation", "set", question.questionId, "--data", JSON.stringify({ feedback: "근거가 부족합니다." })]);
    const second = await runCli(home, ["evaluation", "set", question.questionId, "--data", JSON.stringify({ feedback: "근거가 충분합니다." })]);
    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try { expect(database.query<{ readonly feedback: string }, [string]>("SELECT feedback FROM subjective_evaluations WHERE question_id = ?").get(question.questionId)).toEqual({ feedback: "근거가 충분합니다." }); }
    finally { database.close(); }
  } finally { rmSync(home, { recursive: true, force: true }); }
});
