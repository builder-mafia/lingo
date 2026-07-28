import { describe, expect, test } from "bun:test";

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

describe("lingo --help", () => {
  test("prints concise human-readable root help", async () => {
    const long = await runCli(["--help"]);
    const short = await runCli(["-h"]);

    expect(long.exitCode).toBe(0);
    expect(long.stderr).toBe("");
    expect(long.stdout).toContain("Lingo — turn learning into durable knowledge");
    expect(long.stdout).toContain("Usage:\n  lingo <command> [options]");
    expect(long.stdout).toContain("lingo note content set <note-id>");
    expect(long.stdout).toContain("lingo answer list <note-id>");
    expect(long.stdout).toContain("--update");
    expect(long.stdout).toContain("Use exactly one of --data or --data-file");
    expect(long.stdout).toContain("https://github.com/builder-mafia/lingo");
    expect(() => JSON.parse(long.stdout)).toThrow();
    expect(short).toEqual(long);
  });

  test("keeps help as a standalone root flag", async () => {
    const nested = await runCli(["note", "--help"]);
    const combined = await runCli(["--help", "--version"]);

    expect(nested.exitCode).toBe(1);
    expect(JSON.parse(nested.stderr).error.message).toBe(
      "Usage: lingo --help",
    );
    expect(combined.exitCode).toBe(1);
    expect(JSON.parse(combined.stderr).error.message).toBe(
      "Usage: lingo --help",
    );
  });
});
