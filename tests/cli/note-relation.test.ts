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
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
};

test("adds, lists, and removes an undirected note relation through the CLI", async () => {
  const home = `/tmp/lingo-note-relation-${crypto.randomUUID()}`;

  try {
    const first = await runCli(home, [
      "note",
      "create",
      "--data",
      JSON.stringify({ title: "Effect" }),
    ]);
    const second = await runCli(home, [
      "note",
      "create",
      "--data",
      JSON.stringify({ title: "Fiber", labels: ["Concurrency"] }),
    ]);
    const firstId = JSON.parse(first.stdout).data.noteId;
    const secondId = JSON.parse(second.stdout).data.noteId;
    const added = await runCli(home, [
      "relation",
      "add",
      firstId,
      "--data",
      JSON.stringify({ targetNoteId: secondId }),
    ]);
    const listed = await runCli(home, ["relation", "list", secondId]);
    const relationId = JSON.parse(added.stdout).data.id;
    const removed = await runCli(home, ["relation", "remove", relationId]);
    const empty = await runCli(home, ["relation", "list", firstId]);

    expect(added.exitCode).toBe(0);
    expect([
      JSON.parse(added.stdout).data.noteAId,
      JSON.parse(added.stdout).data.noteBId,
    ]).toEqual([firstId, secondId].sort());
    expect(JSON.parse(listed.stdout).data).toEqual({
      noteId: secondId,
      relations: [
        {
          relation: JSON.parse(added.stdout).data,
          note: { id: firstId, title: "Effect", labels: [] },
        },
      ],
    });
    expect(JSON.parse(removed.stdout).data).toEqual({
      relationId,
      removed: true,
    });
    expect(JSON.parse(empty.stdout).data).toEqual({
      noteId: firstId,
      relations: [],
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
