import { mkdir, rm } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

const projectRoot = resolve(import.meta.dirname, "..");
const uiDirectory = resolve(projectRoot, "dist/ui");
const generatedEntryPath = resolve(projectRoot, "dist/standalone-entry.ts");

const supportedTargets = [
  "bun-darwin-arm64",
  "bun-darwin-x64",
  "bun-linux-arm64",
  "bun-linux-x64-baseline",
] as const satisfies readonly Bun.Build.CompileTarget[];

const isSupportedTarget = (
  value: string,
): value is (typeof supportedTargets)[number] =>
  supportedTargets.some((target) => target === value);

const runUiBuild = async () => {
  const build = Bun.spawn(["bun", "run", "build:ui"], {
    cwd: projectRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await build.exited) !== 0) {
    throw new Error("Could not build browser application assets.");
  }
};

const toImportSpecifier = (from: string, to: string) => {
  const path = relative(from, to).split(sep).join("/");
  return path.startsWith(".") ? path : `./${path}`;
};

const makeStandaloneEntry = async () => {
  const files = Array.from(
    new Bun.Glob("**/*").scanSync({ cwd: uiDirectory, onlyFiles: true }),
  ).sort();

  if (!files.includes("index.html")) {
    throw new Error("Browser application index was not built.");
  }

  const entryDirectory = dirname(generatedEntryPath);
  const imports = files.map((file, index) => {
    const importPath = toImportSpecifier(
      entryDirectory,
      resolve(uiDirectory, file),
    );
    return `import embeddedAsset${index} from ${JSON.stringify(importPath)} with { type: "file" };`;
  });
  const assetEntries = files.map(
    (file, index) =>
      `  ${JSON.stringify(`/${file.split(sep).join("/")}`)}: embeddedAsset${index},`,
  );

  const source = [
    ...imports,
    'import { runCliMain } from "../src/cli-main";',
    'import { makeAppRuntime } from "../src/runtime";',
    'import { makeEmbeddedWebAssets } from "../src/server/web-assets";',
    "",
    "const webAssets = makeEmbeddedWebAssets({",
    ...assetEntries,
    "});",
    "const runtime = makeAppRuntime({ webAssets });",
    "process.exit(await runCliMain(Bun.argv.slice(2), runtime));",
    "",
  ].join("\n");

  await Bun.write(generatedEntryPath, source);
};

const buildBinary = async () => {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      outfile: { type: "string" },
      target: { type: "string" },
    },
    strict: true,
  });
  const outfile = resolve(
    projectRoot,
    values.outfile ?? `dist/bin/lingo${process.platform === "win32" ? ".exe" : ""}`,
  );
  const target = values.target;

  if (target !== undefined && !isSupportedTarget(target)) {
    throw new Error(
      `Unsupported target ${JSON.stringify(target)}. Expected one of: ${supportedTargets.join(", ")}.`,
    );
  }

  const packageMetadata = await Bun.file(
    resolve(projectRoot, "package.json"),
  ).json();
  if (typeof packageMetadata.version !== "string") {
    throw new Error("package.json must contain a version.");
  }

  await runUiBuild();
  await mkdir(dirname(outfile), { recursive: true });
  await makeStandaloneEntry();

  try {
    const compile = Bun.spawn({
      cmd: [
        "bun",
        "build",
        generatedEntryPath,
        "--compile",
        "--minify",
        "--sourcemap=inline",
        `--define=LINGO_BUILD_VERSION=${JSON.stringify(packageMetadata.version)}`,
        "--define=LINGO_STANDALONE=true",
        `--outfile=${outfile}`,
        ...(target === undefined ? [] : [`--target=${target}`]),
      ],
      cwd: projectRoot,
      stdout: "inherit",
      stderr: "inherit",
    });
    if ((await compile.exited) !== 0) {
      throw new Error("Could not compile standalone binary.");
    }
  } finally {
    await rm(generatedEntryPath, { force: true });
  }

  console.log(JSON.stringify({ ok: true, data: { outfile, target } }));
};

await buildBinary().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
