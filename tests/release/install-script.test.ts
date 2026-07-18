import { afterEach, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = new URL("../..", import.meta.url).pathname;
const installerPath = join(projectRoot, "install.sh");
const testDirectories: string[] = [];

afterEach(() => {
  for (const directory of testDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const platformName = () => {
  const operatingSystem =
    process.platform === "darwin"
      ? "darwin"
      : process.platform === "linux"
        ? "linux"
        : undefined;
  const architecture =
    process.arch === "arm64"
      ? "arm64"
      : process.arch === "x64"
        ? "x64"
        : undefined;

  if (operatingSystem === undefined || architecture === undefined) {
    throw new Error("Installer test requires a supported platform.");
  }

  return `${operatingSystem}-${architecture}`;
};

const makeReleaseFixture = async (checksum = "valid") => {
  const root = mkdtempSync(join(tmpdir(), "lingo-installer-test-"));
  testDirectories.push(root);
  const version = "v0.1.0";
  const archiveName = `lingo-${version}-${platformName()}.tar.gz`;
  const releaseDirectory = join(root, "releases", "download", version);
  const packageDirectory = join(root, "package");
  const binaryPath = join(packageDirectory, "lingo");
  mkdirSync(releaseDirectory, { recursive: true });
  mkdirSync(packageDirectory, { recursive: true });

  await Bun.write(
    binaryPath,
    '#!/bin/sh\nprintf \'{"ok":true,"data":{"version":"0.1.0"}}\\n\'\n',
  );
  chmodSync(binaryPath, 0o755);

  const archivePath = join(releaseDirectory, archiveName);
  const archive = Bun.spawn(
    ["tar", "-czf", archivePath, "-C", packageDirectory, "lingo"],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [archiveExitCode, archiveStderr] = await Promise.all([
    archive.exited,
    new Response(archive.stderr).text(),
  ]);
  if (archiveExitCode !== 0) throw new Error(archiveStderr);

  const digest = new Bun.CryptoHasher("sha256")
    .update(await Bun.file(archivePath).arrayBuffer())
    .digest("hex");
  await Bun.write(
    join(releaseDirectory, "SHA256SUMS"),
    `${checksum === "valid" ? digest : "0".repeat(64)}  ${archiveName}\n`,
  );

  return { archiveName, archivePath, releaseDirectory, root, version };
};

const runInstaller = (
  args: readonly string[],
  installDirectory: string,
  releasesUrl: string,
) => {
  const child = Bun.spawn(["sh", installerPath, ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      LINGO_INSTALL_DIR: installDirectory,
      LINGO_RELEASES_URL: releasesUrl,
      PATH: `${installDirectory}:${process.env.PATH ?? ""}`,
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  return Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]).then(([exitCode, stdout, stderr]) => ({ exitCode, stdout, stderr }));
};

test("installer resolves the latest release and installs a runnable binary", async () => {
  expect(await Bun.file(installerPath).exists()).toBe(true);
  const fixture = await makeReleaseFixture();
  const installDirectory = join(fixture.root, "bin");
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request) => {
      const url = new URL(request.url);
      if (url.pathname === "/releases/latest") {
        return Response.redirect(
          new URL(`/releases/tag/${fixture.version}`, url),
          302,
        );
      }
      if (url.pathname === `/releases/tag/${fixture.version}`) {
        return new Response("release");
      }
      if (
        url.pathname ===
        `/releases/download/${fixture.version}/${fixture.archiveName}`
      ) {
        return new Response(Bun.file(fixture.archivePath));
      }
      if (
        url.pathname ===
        `/releases/download/${fixture.version}/SHA256SUMS`
      ) {
        return new Response(
          Bun.file(join(fixture.releaseDirectory, "SHA256SUMS")),
        );
      }
      return new Response("not found", { status: 404 });
    },
  });

  try {
    const result = await runInstaller(
      [],
      installDirectory,
      `http://127.0.0.1:${server.port}/releases`,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(`Installed Lingo ${fixture.version}`);

    const installed = Bun.spawn([join(installDirectory, "lingo"), "--version"], {
      stdout: "pipe",
    });
    const [installedExitCode, installedOutput] = await Promise.all([
      installed.exited,
      new Response(installed.stdout).text(),
    ]);
    expect(installedExitCode).toBe(0);
    expect(JSON.parse(installedOutput)).toEqual({
      ok: true,
      data: { version: "0.1.0" },
    });
  } finally {
    server.stop(true);
  }
}, 10_000);

test("installer rejects a checksum mismatch without replacing an existing binary", async () => {
  expect(await Bun.file(installerPath).exists()).toBe(true);
  const fixture = await makeReleaseFixture("invalid");
  const installDirectory = join(fixture.root, "bin");
  const installedPath = join(installDirectory, "lingo");
  mkdirSync(installDirectory, { recursive: true });
  await Bun.write(installedPath, "existing binary\n");

  const result = await runInstaller(
    ["--version", fixture.version],
    installDirectory,
    `file://${join(fixture.root, "releases")}`,
  );

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("Checksum verification failed");
  expect(await Bun.file(installedPath).text()).toBe("existing binary\n");
});
