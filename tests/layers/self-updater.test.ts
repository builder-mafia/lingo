import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "bun:test";
import { Effect, ManagedRuntime } from "effect";

import {
  SelfUpdater,
  makeSelfUpdaterLayer,
  type SelfUpdaterConfig,
} from "../../src/layers/self-updater";

const latestReleaseUrl =
  "https://api.github.com/repos/builder-mafia/lingo/releases/latest";

type UpdateOutcome =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly error: { readonly details: unknown[] } };

const runUpdate = async (config: SelfUpdaterConfig): Promise<UpdateOutcome> => {
  const runtime = ManagedRuntime.make(makeSelfUpdaterLayer(config));
  try {
    return await runtime.runPromise(
      Effect.gen(function* () {
        return yield* (yield* SelfUpdater).update();
      }).pipe(
        Effect.match({
          onFailure: (error) => ({ ok: false as const, error }),
          onSuccess: (data) => ({ ok: true as const, data }),
        }),
      ),
    );
  } finally {
    await runtime.dispose();
  }
};

const makeArchive = async (root: string, content = "new binary") => {
  const releaseDirectory = join(root, "release");
  const binaryPath = join(releaseDirectory, "lingo");
  const archivePath = join(root, "lingo.tar.gz");
  await mkdir(releaseDirectory);
  await writeFile(binaryPath, content);
  await chmod(binaryPath, 0o755);

  const child = Bun.spawn(
    ["tar", "-czf", archivePath, "-C", releaseDirectory, "lingo"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) throw new Error(stderr);

  const bytes = await Bun.file(archivePath).arrayBuffer();
  const checksum = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
  return { bytes, checksum };
};

type ReleaseFixtureOptions = {
  readonly archiveBytes: ArrayBuffer;
  readonly checksum: string;
  readonly version?: string;
  readonly releaseStatus?: number;
  readonly releaseBody?: string;
};

const makeReleaseFetch = ({
  archiveBytes,
  checksum,
  version = "0.3.0",
  releaseStatus = 200,
  releaseBody,
}: ReleaseFixtureOptions) => {
  const tag = `v${version}`;
  const archiveName = `lingo-${tag}-darwin-arm64.tar.gz`;
  const archiveUrl =
    `https://github.com/builder-mafia/lingo/releases/download/${tag}/${archiveName}`;
  const checksumsUrl =
    `https://github.com/builder-mafia/lingo/releases/download/${tag}/SHA256SUMS`;
  const calls: string[] = [];

  const fetch: SelfUpdaterConfig["fetch"] = async (url) => {
    calls.push(url);
    if (url === latestReleaseUrl) {
      const body =
        releaseBody ??
        JSON.stringify({
          tag_name: tag,
          draft: false,
          prerelease: false,
          assets: [
            { name: archiveName, browser_download_url: archiveUrl },
            { name: "SHA256SUMS", browser_download_url: checksumsUrl },
          ],
        });
      return new Response(body, { status: releaseStatus });
    }
    if (url === archiveUrl) {
      return new Response(archiveBytes.slice(0), { status: 200 });
    }
    if (url === checksumsUrl) {
      return new Response(`${checksum}  ${archiveName}\n`, { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };

  return { calls, fetch };
};

const makeConfig = (
  executablePath: string,
  fetch: SelfUpdaterConfig["fetch"],
  overrides: Partial<SelfUpdaterConfig> = {},
): SelfUpdaterConfig => ({
  architecture: "arm64",
  currentVersion: "0.2.0",
  executablePath,
  fetch,
  platform: "darwin",
  standalone: true,
  verifyBinary: async (path, expectedVersion) => {
    if ((await readFile(path, "utf8")) !== "new binary") {
      throw new Error("downloaded binary content is invalid");
    }
    if (expectedVersion !== "0.3.0") {
      throw new Error(`unexpected version ${expectedVersion}`);
    }
  },
  ...overrides,
});

describe("SelfUpdater", () => {
  test("downloads, verifies, and atomically replaces a standalone binary", async () => {
    const root = await mkdtemp(join(tmpdir(), "lingo-update-success-"));
    const executablePath = join(root, "lingo");
    try {
      await writeFile(executablePath, "old binary");
      await chmod(executablePath, 0o755);
      const archive = await makeArchive(root);
      const release = makeReleaseFetch({
        archiveBytes: archive.bytes,
        checksum: archive.checksum,
      });

      const result = await runUpdate(makeConfig(executablePath, release.fetch));

      expect(result).toEqual({
        ok: true,
        data: {
          updated: true,
          previousVersion: "0.2.0",
          version: "0.3.0",
        },
      });
      expect(await readFile(executablePath, "utf8")).toBe("new binary");
      expect(release.calls).toHaveLength(3);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("does not download or downgrade when the current version is not older", async () => {
    const root = await mkdtemp(join(tmpdir(), "lingo-update-current-"));
    const executablePath = join(root, "lingo");
    try {
      await writeFile(executablePath, "old binary");
      await chmod(executablePath, 0o755);
      const release = makeReleaseFetch({
        archiveBytes: new ArrayBuffer(0),
        checksum: "unused",
        version: "0.2.0",
      });

      const result = await runUpdate(makeConfig(executablePath, release.fetch));

      expect(result).toEqual({
        ok: true,
        data: { updated: false, version: "0.2.0" },
      });
      expect(release.calls).toEqual([latestReleaseUrl]);

      const older = makeReleaseFetch({
        archiveBytes: new ArrayBuffer(0),
        checksum: "unused",
        version: "0.1.0",
      });
      const ahead = await runUpdate(
        makeConfig(executablePath, older.fetch, { currentVersion: "0.3.0" }),
      );
      expect(ahead).toEqual({
        ok: true,
        data: { updated: false, version: "0.3.0" },
      });
      expect(await readFile(executablePath, "utf8")).toBe("old binary");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("preserves the existing binary when checksum verification fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "lingo-update-checksum-"));
    const executablePath = join(root, "lingo");
    try {
      await writeFile(executablePath, "old binary");
      await chmod(executablePath, 0o755);
      const archive = await makeArchive(root);
      const release = makeReleaseFetch({
        archiveBytes: archive.bytes,
        checksum: "0".repeat(64),
      });

      const result = await runUpdate(makeConfig(executablePath, release.fetch));

      expect(result.ok).toBe(false);
      expect(await readFile(executablePath, "utf8")).toBe("old binary");
      if (!result.ok) {
        expect(result.error.details.join("\n")).toContain("checksum");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("preserves the existing binary when staged version verification fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "lingo-update-version-"));
    const executablePath = join(root, "lingo");
    try {
      await writeFile(executablePath, "old binary");
      await chmod(executablePath, 0o755);
      const archive = await makeArchive(root);
      const release = makeReleaseFetch({
        archiveBytes: archive.bytes,
        checksum: archive.checksum,
      });

      const result = await runUpdate(
        makeConfig(executablePath, release.fetch, {
          verifyBinary: async () => {
            throw new Error("version output was 0.2.0, expected 0.3.0");
          },
        }),
      );

      expect(result.ok).toBe(false);
      expect(await readFile(executablePath, "utf8")).toBe("old binary");
      if (!result.ok) {
        expect(result.error.details.join("\n")).toContain(
          "version output was 0.2.0",
        );
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects source runs, unsafe paths, unsupported platforms, and concurrent updates", async () => {
    const root = await mkdtemp(join(tmpdir(), "lingo-update-guard-"));
    const executablePath = join(root, "lingo");
    const symlinkPath = join(root, "linked-lingo");
    const noNetwork: SelfUpdaterConfig["fetch"] = async () => {
      throw new Error("network should not be called");
    };
    try {
      await writeFile(executablePath, "old binary");
      await chmod(executablePath, 0o755);
      await symlink(executablePath, symlinkPath);

      const sourceRun = await runUpdate(
        makeConfig(executablePath, noNetwork, { standalone: false }),
      );
      const symlinkRun = await runUpdate(makeConfig(symlinkPath, noNetwork));
      await chmod(executablePath, 0o555);
      const unwritableRun = await runUpdate(
        makeConfig(executablePath, noNetwork),
      );
      await chmod(executablePath, 0o755);

      const newer = makeReleaseFetch({
        archiveBytes: new ArrayBuffer(0),
        checksum: "unused",
      });
      const unsupported = await runUpdate(
        makeConfig(executablePath, newer.fetch, { platform: "win32" }),
      );

      await writeFile(join(dirname(executablePath), ".lingo.update.lock"), "1");
      const concurrent = await runUpdate(makeConfig(executablePath, noNetwork));

      expect(sourceRun.ok).toBe(false);
      expect(symlinkRun.ok).toBe(false);
      expect(unwritableRun.ok).toBe(false);
      expect(unsupported.ok).toBe(false);
      expect(concurrent.ok).toBe(false);
      expect(await readFile(executablePath, "utf8")).toBe("old binary");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("exposes upstream response and stack diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "lingo-update-diagnostics-"));
    const executablePath = join(root, "lingo");
    try {
      await writeFile(executablePath, "old binary");
      await chmod(executablePath, 0o755);
      const release = makeReleaseFetch({
        archiveBytes: new ArrayBuffer(0),
        checksum: "unused",
        releaseBody: "API rate limit exceeded",
        releaseStatus: 403,
      });

      const result = await runUpdate(makeConfig(executablePath, release.fetch));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const details = result.error.details.join("\n");
        expect(details).toContain("stage: fetch-latest-release");
        expect(details).toContain(`url: ${latestReleaseUrl}`);
        expect(details).toContain("status: 403");
        expect(details).toContain("response: API rate limit exceeded");
        expect(details).toContain("stack:");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("keeps a successful but invalid upstream response in diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "lingo-update-invalid-release-"));
    const executablePath = join(root, "lingo");
    try {
      await writeFile(executablePath, "old binary");
      await chmod(executablePath, 0o755);
      const release = makeReleaseFetch({
        archiveBytes: new ArrayBuffer(0),
        checksum: "unused",
        releaseBody: "not-json",
      });

      const result = await runUpdate(makeConfig(executablePath, release.fetch));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const details = result.error.details.join("\n");
        expect(details).toContain("stage: fetch-latest-release");
        expect(details).toContain("response: not-json");
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
