import { Database as SqliteDatabase } from "bun:sqlite";
import { rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("returns a coarse error without persisting a subjective problem for a missing note", async () => {
  const home = `/tmp/lingo-subjective-missing-${crypto.randomUUID()}`;
  const child = Bun.spawn([
    "bun", "run", cliPath, "note", "problem", "subjective", "add",
    "f26a9922-c4a0-4de0-90fa-1e1a6cc46405", "--data",
    JSON.stringify({ question: "저장 불가", referenceAnswer: "답" }),
  ], { cwd: projectRoot, env: { ...process.env, HOME: home }, stdout: "pipe", stderr: "pipe" });

  try {
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    expect(exitCode).toBe(1);
    expect(JSON.parse(stderr).error.message).toBe("Could not add subjective problem.");
    const database = new SqliteDatabase(`${home}/.lingo/lingo.sqlite`);
    try {
      expect(database.query("SELECT id FROM subjective_problems").all()).toEqual([]);
    } finally { database.close(); }
  } finally { rmSync(home, { recursive: true, force: true }); }
});
