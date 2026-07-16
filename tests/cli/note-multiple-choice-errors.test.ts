import { Database as SqliteDatabase } from "bun:sqlite";
import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("returns a coarse error without persisting a problem for a missing note", async () => {
  const home = `/tmp/lingo-problem-missing-${crypto.randomUUID()}`;
  const child = Bun.spawn(
    [
      "bun",
      "run",
      cliPath,
      "problem",
      "add",
      "f26a9922-c4a0-4de0-90fa-1e1a6cc46405",
      "--data",
      JSON.stringify({
        question: "저장될 수 없는 문제",
        choices: [
          { order: 1, option: "하나", explanation: "설명" },
          { order: 2, option: "둘", explanation: "설명" },
        ],
        correctId: 1,
      }),
    ],
    { cwd: projectRoot, env: { ...process.env, HOME: home }, stdout: "pipe", stderr: "pipe" },
  );

  try {
    const [exitCode, stderr] = await Promise.all([
      child.exited,
      new Response(child.stderr).text(),
    ]);
    expect(exitCode).toBe(1);
    expect(JSON.parse(stderr).error.message).toBe("Could not add multiple-choice problem.");

    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try {
      expect(database.query("SELECT id FROM multiple_choice_problems").all()).toEqual([]);
      expect(database.query("SELECT problem_id FROM multiple_choice_choices").all()).toEqual([]);
    } finally {
      database.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
