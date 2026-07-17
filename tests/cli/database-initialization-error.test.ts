import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;
const runWithUnavailableHome = (args: readonly string[]) =>
  Bun.spawn(["bun", "run", cliPath, ...args], {
    cwd: projectRoot,
    env: { ...process.env, HOME: "/dev/null" },
    stdout: "pipe",
    stderr: "pipe",
  });

test("returns a JSON CLI error when note database initialization fails", async () => {
  const child = runWithUnavailableHome(["note", "create"]);
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);

  expect(exitCode).toBe(1);
  expect(JSON.parse(stderr)).toEqual({
    ok: false,
    error: {
      code: "CliError",
      message: "Could not initialize local database.",
      details: [],
    },
  });
});
