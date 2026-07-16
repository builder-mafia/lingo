import { Database as SqliteDatabase } from "bun:sqlite";
import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const runCli = async (home: string, args: readonly string[]) => {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], {
    cwd: projectRoot,
    env: { ...process.env, HOME: home },
    stdout: "pipe",
  });
  const [exitCode, stdout] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
  ]);
  return { exitCode, stdout };
};

test("stores a subjective problem for a note", async () => {
  const home = `/tmp/lingo-subjective-${crypto.randomUUID()}`;

  try {
    const created = await runCli(home, ["note", "create"]);
    const noteId = JSON.parse(created.stdout).data.noteId;
    const result = await runCli(home, [
      "problem",
      "add",
      noteId,
      "--data",
      JSON.stringify({
        question: "이 사업 아이디어의 핵심 고객 문제를 설명하세요.",
        referenceAnswer: "고객이 반복적으로 겪는 비용 큰 문제를 구체적으로 설명한다.",
      }),
    ]);

    expect(result.exitCode).toBe(0);
    const problem = JSON.parse(result.stdout).data;
    expect(problem).toMatchObject({ noteId });

    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try {
      const stored = database
        .query<{ readonly question: string; readonly referenceAnswer: string }, [string]>(
          "SELECT question, reference_answer AS referenceAnswer FROM subjective_problems WHERE id = ?",
        )
        .get(problem.problemId);
      expect(stored).toEqual({
        question: "이 사업 아이디어의 핵심 고객 문제를 설명하세요.",
        referenceAnswer: "고객이 반복적으로 겪는 비용 큰 문제를 구체적으로 설명한다.",
      });
    } finally {
      database.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
