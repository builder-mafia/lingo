import { resolve } from "node:path";
import { parseArgs } from "node:util";

type CommandResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

const runGit = async (args: readonly string[]): Promise<CommandResult> => {
  const child = Bun.spawn(["git", ...args], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return {
    exitCode,
    stderr: stderr.trim(),
    stdout: stdout.trim(),
  };
};

const git = async (...args: string[]) => {
  const result = await runGit(args);
  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr || `git ${args.join(" ")} exited with ${result.exitCode}`,
    );
  }
  return result.stdout;
};

const release = async () => {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "dry-run": { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
    },
    strict: true,
  });
  const packageJson = await Bun.file(
    resolve(process.cwd(), "package.json"),
  ).json();
  const version = packageJson.version;

  if (
    typeof version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
      version,
    )
  ) {
    throw new Error("package.json must contain a valid semantic version.");
  }

  const tag = `v${version}`;

  await git("fetch", "origin", "main", "--tags");

  const branch = await git("branch", "--show-current");
  if (branch !== "main") {
    throw new Error(
      `release must run on main; current branch is ${branch || "detached"}.`,
    );
  }

  const status = await git("status", "--porcelain");
  if (status !== "") {
    throw new Error("working tree must be clean before releasing.");
  }

  const head = await git("rev-parse", "HEAD");
  const remoteMain = await git("rev-parse", "refs/remotes/origin/main");
  if (head !== remoteMain) {
    throw new Error("main must match origin/main before releasing.");
  }

  const existingTag = await runGit([
    "show-ref",
    "--verify",
    "--quiet",
    `refs/tags/${tag}`,
  ]);
  if (existingTag.exitCode === 0) {
    throw new Error(`tag ${tag} already exists.`);
  }
  if (existingTag.exitCode !== 1) {
    throw new Error(existingTag.stderr || `could not check tag ${tag}.`);
  }

  console.log(`Ready to release ${tag} from ${head.slice(0, 7)}.`);

  if (values["dry-run"]) {
    console.log("Dry run complete; no tag was created.");
    return;
  }

  if (!values.yes) {
    if (!process.stdin.isTTY) {
      throw new Error("confirmation required; rerun with --yes.");
    }
    const answer = prompt(`Create and push ${tag}? [y/N]`);
    if (answer?.trim().toLowerCase() !== "y") {
      console.log("Release canceled.");
      return;
    }
  }

  await git("tag", "-a", tag, "-m", `Release ${tag}`);
  await git("push", "origin", `refs/tags/${tag}`);
  console.log(`Pushed ${tag}. GitHub Actions will publish the release.`);
};

await release().catch((error: unknown) => {
  console.error(
    `error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
