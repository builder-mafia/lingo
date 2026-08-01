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

test("adds, lists, and removes structured note sources through the CLI", async () => {
  const home = `/tmp/lingo-note-source-${crypto.randomUUID()}`;

  try {
    const created = await runCli(home, [
      "note",
      "create",
      "--data",
      JSON.stringify({ title: "Effect error handling" }),
    ]);
    const noteId = JSON.parse(created.stdout).data.noteId;
    const added = await runCli(home, [
      "note",
      "source",
      "add",
      noteId,
      "--data",
      JSON.stringify({
        title: "Effect documentation",
        url: "https://effect.website/docs/error-management/",
        description: "Error handling semantics checked for this note.",
      }),
    ]);
    const source = JSON.parse(added.stdout).data;
    const listed = await runCli(home, ["note", "source", "list", noteId]);
    const removed = await runCli(home, ["note", "source", "remove", source.id]);

    expect(added.exitCode).toBe(0);
    expect(source).toMatchObject({ noteId, position: 1 });
    expect(JSON.parse(listed.stdout).data).toEqual({ noteId, sources: [source] });
    expect(JSON.parse(removed.stdout).data).toEqual({
      sourceId: source.id,
      removed: true,
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
