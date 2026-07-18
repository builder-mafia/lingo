import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = new URL("../..", import.meta.url).pathname;
const releaseScript = join(projectRoot, "scripts", "release.ts");
const testDirectories: string[] = [];

afterEach(() => {
  for (const directory of testDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const run = async (command: readonly string[], cwd: string) => {
  const child = Bun.spawn([...command], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return { exitCode, stderr, stdout };
};

const git = async (cwd: string, ...args: string[]) => {
  const result = await run(["git", ...args], cwd);
  if (result.exitCode !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
};

const makeRepository = async () => {
  const root = mkdtempSync(join(tmpdir(), "lingo-release-command-"));
  testDirectories.push(root);
  const remote = join(root, "remote.git");
  const worktree = join(root, "worktree");
  mkdirSync(worktree);

  await git(root, "init", "--bare", "--initial-branch=main", remote);
  await git(worktree, "init", "--initial-branch=main");
  await git(worktree, "config", "user.name", "Lingo Test");
  await git(worktree, "config", "user.email", "test@lingo.local");
  await Bun.write(
    join(worktree, "package.json"),
    `${JSON.stringify(
      {
        name: "lingo",
        scripts: { release: `bun run ${releaseScript}` },
        version: "1.2.3",
      },
      null,
      2,
    )}\n`,
  );
  await Bun.write(join(worktree, "README.md"), "# Fixture\n");
  await git(worktree, "add", "package.json", "README.md");
  await git(worktree, "commit", "-m", "initial");
  await git(worktree, "remote", "add", "origin", remote);
  await git(worktree, "push", "-u", "origin", "main");

  return { remote, worktree };
};

describe("release command", () => {
  test("is exposed through the package release script", async () => {
    const packageJson = await Bun.file(
      join(projectRoot, "package.json"),
    ).json();

    expect(packageJson.scripts.release).toBe("bun run scripts/release.ts");
  });

  test("previews the package version without creating a tag", async () => {
    const fixture = await makeRepository();

    const result = await run(
      ["bun", "run", "release", "--dry-run"],
      fixture.worktree,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Ready to release v1.2.3");
    expect(result.stdout).toContain("Dry run complete");
    expect(await git(fixture.worktree, "tag", "--list", "v1.2.3")).toBe("");
  });

  test("creates and pushes an annotated version tag", async () => {
    const fixture = await makeRepository();

    const result = await run(
      ["bun", "run", "release", "--yes"],
      fixture.worktree,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Pushed v1.2.3");
    expect(
      await git(fixture.worktree, "cat-file", "-t", "refs/tags/v1.2.3"),
    ).toBe("tag");
    expect(
      await git(
        fixture.worktree,
        "--git-dir",
        fixture.remote,
        "rev-parse",
        "refs/tags/v1.2.3^{}",
      ),
    ).toBe(await git(fixture.worktree, "rev-parse", "HEAD"));
  });

  test("refuses to release a dirty worktree", async () => {
    const fixture = await makeRepository();
    await Bun.write(join(fixture.worktree, "README.md"), "changed\n");

    const result = await run(
      ["bun", "run", "release", "--yes"],
      fixture.worktree,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("working tree must be clean");
    expect(await git(fixture.worktree, "tag", "--list", "v1.2.3")).toBe("");
  });
});
