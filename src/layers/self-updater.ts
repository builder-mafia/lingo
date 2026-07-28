import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  chmod,
  lstat,
  mkdtemp,
  open,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { Context, Effect, Layer } from "effect";

import { CliError } from "../cli/errors";
import {
  cliVersionResponseSchema,
  latestReleaseSchema,
  selfUpdateResultSchema,
  type SelfUpdateResult,
} from "../schemas/self-update";

const latestReleaseUrl =
  "https://api.github.com/repos/builder-mafia/lingo/releases/latest";
const releaseDownloadPrefix =
  "https://github.com/builder-mafia/lingo/releases/download";
const requestTimeoutMilliseconds = 120_000;

type DiagnosticState = {
  stage: string;
  url?: string;
  status?: number;
  response?: string;
};

export type SelfUpdaterConfig = {
  readonly architecture: string;
  readonly currentVersion: string;
  readonly executablePath: string;
  readonly fetch: (url: string, init?: RequestInit) => Promise<Response>;
  readonly platform: string;
  readonly standalone: boolean;
  readonly verifyBinary?: (
    path: string,
    expectedVersion: string,
  ) => Promise<void>;
};

export interface SelfUpdaterService {
  readonly update: () => Effect.Effect<SelfUpdateResult, CliError>;
}

export class SelfUpdater extends Context.Tag("@lingo/SelfUpdater")<
  SelfUpdater,
  SelfUpdaterService
>() {}

type ParsedVersion = {
  readonly core: readonly [bigint, bigint, bigint];
  readonly prerelease: readonly string[] | undefined;
};

const parseVersion = (version: string): ParsedVersion => {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/,
  );
  if (!match) throw new Error(`Invalid semantic version: ${version}`);

  return {
    core: [BigInt(match[1]!), BigInt(match[2]!), BigInt(match[3]!)],
    prerelease: match[4]?.split("."),
  };
};

const comparePrerelease = (
  left: readonly string[] | undefined,
  right: readonly string[] | undefined,
) => {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;

    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) {
      return BigInt(leftPart) < BigInt(rightPart) ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return leftPart < rightPart ? -1 : 1;
  }
  return 0;
};

const compareVersions = (left: string, right: string) => {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  for (let index = 0; index < leftVersion.core.length; index += 1) {
    const leftPart = leftVersion.core[index]!;
    const rightPart = rightVersion.core[index]!;
    if (leftPart !== rightPart) return leftPart < rightPart ? -1 : 1;
  }
  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
};

const selectPlatform = (platform: string, architecture: string) => {
  const operatingSystem =
    platform === "darwin" || platform === "linux" ? platform : undefined;
  const cpu =
    architecture === "arm64" || architecture === "x64"
      ? architecture
      : undefined;
  if (!operatingSystem || !cpu) {
    throw new Error(`Unsupported platform: ${platform}-${architecture}`);
  }
  return `${operatingSystem}-${cpu}`;
};

const checksumFor = (manifest: string, filename: string) => {
  for (const line of manifest.split(/\r?\n/)) {
    const [checksum, listedFilename] = line.trim().split(/\s+/, 2);
    if (listedFilename?.replace(/^\*/, "") !== filename) continue;
    if (!checksum || !/^[a-f0-9]{64}$/i.test(checksum)) {
      throw new Error(`Invalid checksum for ${filename}`);
    }
    return checksum.toLowerCase();
  }
  throw new Error(`No checksum found for ${filename}`);
};

const runProcess = async (command: readonly string[]) => {
  const child = Bun.spawn([...command], { stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `${command.join(" ")} exited with ${exitCode}: ${stderr || stdout}`,
    );
  }
  return stdout;
};

const verifyBinaryVersion = async (path: string, expectedVersion: string) => {
  const child = Bun.spawn([path, "--version"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `Downloaded binary exited with ${exitCode}: ${stderr || stdout}`,
    );
  }
  const response = cliVersionResponseSchema.parse(JSON.parse(stdout));
  if (response.data.version !== expectedVersion) {
    throw new Error(
      `Downloaded binary reported ${response.data.version}, expected ${expectedVersion}`,
    );
  }
};

const diagnosticDetails = (state: DiagnosticState, cause: unknown) => {
  const details: unknown[] = [`stage: ${state.stage}`];
  if (state.url) details.push(`url: ${state.url}`);
  if (state.status !== undefined) details.push(`status: ${state.status}`);
  if (state.response !== undefined) {
    details.push(`response: ${state.response}`);
  }
  if (cause instanceof Error) {
    details.push(`cause: ${cause.message}`);
    if (cause.stack) details.push(`stack: ${cause.stack}`);
  } else {
    details.push(`cause: ${String(cause)}`);
  }
  return details;
};

const makeService = (config: SelfUpdaterConfig): SelfUpdaterService => ({
  update: () => {
    const diagnostics: DiagnosticState = { stage: "initialize" };
    const beginStage = (stage: string, url?: string) => {
      diagnostics.stage = stage;
      diagnostics.url = url;
      diagnostics.status = undefined;
      diagnostics.response = undefined;
    };

    return Effect.tryPromise({
      try: async () => {
        let lockOwned = false;
        let temporaryDirectory: string | undefined;
        const executableDirectory = dirname(config.executablePath);
        const lockPath = join(executableDirectory, ".lingo.update.lock");

        try {
          beginStage("validate-runtime");
          if (!config.standalone) {
            throw new Error(
              "Self-update is available only in a standalone Lingo binary.",
            );
          }

          beginStage("validate-executable");
          const executable = await lstat(config.executablePath);
          if (executable.isSymbolicLink()) {
            throw new Error("Refusing to replace a symbolic link.");
          }
          if (!executable.isFile()) {
            throw new Error("The running Lingo executable is not a regular file.");
          }
          await access(config.executablePath, constants.R_OK | constants.W_OK);
          await access(executableDirectory, constants.W_OK);

          beginStage("acquire-update-lock");
          const lock = await open(lockPath, "wx", 0o600);
          lockOwned = true;
          try {
            await lock.writeFile(String(process.pid));
          } finally {
            await lock.close();
          }

          const fetchText = async (stage: string, url: string) => {
            beginStage(stage, url);
            const response = await config.fetch(url, {
              headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": `lingo/${config.currentVersion}`,
              },
              signal: AbortSignal.timeout(requestTimeoutMilliseconds),
            });
            const body = await response.text();
            diagnostics.status = response.status;
            diagnostics.response = body;
            if (!response.ok) {
              throw new Error(`GitHub request failed with ${response.status}.`);
            }
            return body;
          };

          const fetchBytes = async (stage: string, url: string) => {
            beginStage(stage, url);
            const response = await config.fetch(url, {
              headers: { "User-Agent": `lingo/${config.currentVersion}` },
              signal: AbortSignal.timeout(requestTimeoutMilliseconds),
            });
            if (!response.ok) {
              diagnostics.status = response.status;
              diagnostics.response = await response.text();
              throw new Error(`GitHub request failed with ${response.status}.`);
            }
            return new Uint8Array(await response.arrayBuffer());
          };

          const release = latestReleaseSchema.parse(
            JSON.parse(
              await fetchText("fetch-latest-release", latestReleaseUrl),
            ),
          );
          if (release.draft || release.prerelease) {
            throw new Error("GitHub returned a non-stable release.");
          }
          if (!release.tag_name.startsWith("v")) {
            throw new Error(`Invalid release tag: ${release.tag_name}`);
          }
          const latestVersion = release.tag_name.slice(1);
          const parsedLatestVersion = parseVersion(latestVersion);
          if (parsedLatestVersion.prerelease) {
            throw new Error(`Release ${release.tag_name} is not stable.`);
          }

          if (compareVersions(config.currentVersion, latestVersion) >= 0) {
            return selfUpdateResultSchema.parse({
              updated: false,
              version: config.currentVersion,
            });
          }

          beginStage("select-release-asset");
          const platform = selectPlatform(config.platform, config.architecture);
          const archiveName =
            `lingo-${release.tag_name}-${platform}.tar.gz`;
          const archive = release.assets.find(
            (asset) => asset.name === archiveName,
          );
          const checksums = release.assets.find(
            (asset) => asset.name === "SHA256SUMS",
          );
          if (!archive || !checksums) {
            throw new Error(
              `Release ${release.tag_name} does not contain ${archiveName} and SHA256SUMS.`,
            );
          }
          const expectedArchiveUrl =
            `${releaseDownloadPrefix}/${release.tag_name}/${archiveName}`;
          const expectedChecksumsUrl =
            `${releaseDownloadPrefix}/${release.tag_name}/SHA256SUMS`;
          if (
            archive.browser_download_url !== expectedArchiveUrl ||
            checksums.browser_download_url !== expectedChecksumsUrl
          ) {
            throw new Error("Release assets use an unexpected download URL.");
          }

          beginStage("prepare-update");
          temporaryDirectory = await mkdtemp(
            join(executableDirectory, ".lingo.update."),
          );
          const archivePath = join(temporaryDirectory, archiveName);
          const checksumsPath = join(temporaryDirectory, "SHA256SUMS");
          await writeFile(
            archivePath,
            await fetchBytes(
              "download-release-archive",
              archive.browser_download_url,
            ),
          );
          await writeFile(
            checksumsPath,
            await fetchText(
              "download-release-checksums",
              checksums.browser_download_url,
            ),
          );

          beginStage("verify-checksum");
          const expectedChecksum = checksumFor(
            await readFile(checksumsPath, "utf8"),
            archiveName,
          );
          const actualChecksum = createHash("sha256")
            .update(await readFile(archivePath))
            .digest("hex");
          if (actualChecksum !== expectedChecksum) {
            throw new Error(
              `Checksum verification failed for ${archiveName}: expected ${expectedChecksum}, received ${actualChecksum}.`,
            );
          }

          beginStage("inspect-release-archive");
          const archiveEntries = (
            await runProcess(["tar", "-tzf", archivePath])
          ).trim();
          if (archiveEntries !== "lingo") {
            throw new Error(
              `Release archive has unexpected contents: ${archiveEntries}`,
            );
          }

          beginStage("extract-release-archive");
          await runProcess([
            "tar",
            "-xzf",
            archivePath,
            "-C",
            temporaryDirectory,
          ]);
          const stagedBinary = join(temporaryDirectory, "lingo");
          const staged = await lstat(stagedBinary);
          if (!staged.isFile() || staged.isSymbolicLink()) {
            throw new Error("Release archive does not contain a regular binary.");
          }
          await chmod(stagedBinary, 0o755);

          beginStage("verify-binary-version");
          await (config.verifyBinary ?? verifyBinaryVersion)(
            stagedBinary,
            latestVersion,
          );

          beginStage("replace-executable");
          await rename(stagedBinary, config.executablePath);
          return selfUpdateResultSchema.parse({
            updated: true,
            previousVersion: config.currentVersion,
            version: latestVersion,
          });
        } finally {
          if (temporaryDirectory) {
            await rm(temporaryDirectory, { recursive: true, force: true }).catch(
              () => undefined,
            );
          }
          if (lockOwned) {
            await unlink(lockPath).catch(() => undefined);
          }
        }
      },
      catch: (cause) =>
        new CliError(
          "Could not update Lingo.",
          diagnosticDetails(diagnostics, cause),
        ),
    });
  },
});

export const makeSelfUpdaterLayer = (config: SelfUpdaterConfig) =>
  Layer.succeed(SelfUpdater, makeService(config));
