import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

test("lingo --version reports the package version as JSON", async () => {
  const child = Bun.spawn(["bun", "run", cliPath, "--version"], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  expect(exitCode).toBe(0);
  expect(stderr).toBe("");
  expect(JSON.parse(stdout)).toEqual({
    ok: true,
    data: { version: "0.2.0" },
  });
});
