import { existsSync, rmSync } from "node:fs";
import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const tempHome = () => `/tmp/lingo-home-${crypto.randomUUID()}`;

test("lingo note create persists a note in the default local database", async () => {
  const home = tempHome();
  const child = Bun.spawn(
    ["bun", "run", cliPath, "note", "create"],
    {
      cwd: projectRoot,
      env: { ...process.env, HOME: home },
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  try {
    const [exitCode, stdout] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
    ]);
    const response = JSON.parse(stdout);

    expect(exitCode).toBe(0);
    expect(response.ok).toBe(true);
    expect(response.data.id).toBeUndefined();
    expect(response.data.noteUrl).toBe(
      `http://127.0.0.1:4312/notes/${response.data.noteId}`,
    );
    expect(existsSync(`${home}/.lingo/lingo.sqlite`)).toBe(true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
