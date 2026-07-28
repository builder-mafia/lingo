import { expect, test } from "bun:test";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

const runCli = async (args: readonly string[]) => {
  const child = Bun.spawn(["bun", "run", cliPath, ...args], {
    cwd: projectRoot,
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

test("rejects self-update outside a standalone Lingo binary", async () => {
  const result = await runCli(["--update"]);

  expect(result.exitCode).toBe(1);
  expect(result.stdout).toBe("");
  const response = JSON.parse(result.stderr);
  expect(response).toMatchObject({
    ok: false,
    error: {
      code: "CliError",
      message: "Could not update Lingo.",
    },
  });
  expect(response.error.details).toContain("stage: validate-runtime");
  expect(response.error.details.join("\n")).toContain("standalone");
});

test("keeps update as a standalone root flag", async () => {
  const result = await runCli(["--update", "--help"]);

  expect(result.exitCode).toBe(1);
  expect(JSON.parse(result.stderr).error.message).toBe(
    "Usage: lingo --update",
  );
});
