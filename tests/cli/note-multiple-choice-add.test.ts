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
    stderr: "pipe",
  });

  const [exitCode, stdout] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
  ]);

  return { exitCode, stdout };
};

test("stores a multiple-choice problem and its choices for a note", async () => {
  const home = `/tmp/lingo-problem-${crypto.randomUUID()}`;

  try {
    const created = await runCli(home, ["note", "create"]);
    const noteId = JSON.parse(created.stdout).data.noteId;
    const result = await runCli(home, [
      "note",
      "problem",
      "multiple-choice",
      "add",
      noteId,
      "--data",
      JSON.stringify({
        question: "어떤 선택이 정답인가요?",
        choices: [
          { order: 1, option: "첫 번째", explanation: "오답" },
          { order: 2, option: "두 번째", explanation: "정답" },
        ],
        correctId: 2,
      }),
    ]);

    expect(result.exitCode).toBe(0);
    const problem = JSON.parse(result.stdout).data;
    expect(problem).toMatchObject({ noteId, correctId: 2 });

    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try {
      const storedChoices = database
        .query<{ readonly option: string }, [string]>(
          "SELECT option FROM multiple_choice_choices WHERE problem_id = ? ORDER BY choice_order",
        )
        .all(problem.problemId);
      expect(storedChoices).toEqual([{ option: "첫 번째" }, { option: "두 번째" }]);
    } finally {
      database.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
