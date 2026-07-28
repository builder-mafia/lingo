import { afterAll, beforeAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = new URL("../..", import.meta.url).pathname;
const buildDirectory = mkdtempSync(join(tmpdir(), "lingo-binary-build-"));
const binaryPath = join(buildDirectory, "lingo");

beforeAll(async () => {
  const build = Bun.spawn(
    ["bun", "run", "build:binary", "--outfile", binaryPath],
    {
      cwd: projectRoot,
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    build.exited,
    new Response(build.stdout).text(),
    new Response(build.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(`Could not build standalone binary.\n${stdout}\n${stderr}`);
  }
}, 120_000);

afterAll(() => {
  rmSync(buildDirectory, { recursive: true, force: true });
});

const findAvailablePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a local test port."));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });

const readLine = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (!output.includes("\n")) {
    const { done, value } = await reader.read();
    if (done) {
      throw new Error("Server exited before reporting its address.");
    }
    output += decoder.decode(value, { stream: true });
  }

  return output.slice(0, output.indexOf("\n"));
};

test("standalone binary reports its embedded version", async () => {
  expect(existsSync(binaryPath)).toBe(true);

  const child = Bun.spawn([binaryPath, "--version"], {
    cwd: buildDirectory,
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
    data: { version: "0.3.0" },
  });
});

test("standalone binary serves embedded UI and writes data outside the project", async () => {
  const port = await findAvailablePort();
  const home = mkdtempSync(join(tmpdir(), "lingo-binary-home-"));
  const child = Bun.spawn([binaryPath, "start"], {
    cwd: home,
    env: { ...process.env, HOME: home, LINGO_PORT: String(port) },
    stdout: "pipe",
    stderr: "pipe",
  });

  try {
    const line = await Promise.race([
      readLine(child.stdout),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Standalone server did not start in time.")),
          5_000,
        ),
      ),
    ]);
    const started = JSON.parse(line);
    const serverUrl = `http://127.0.0.1:${port}`;

    expect(started).toEqual({ ok: true, data: { serverUrl } });

    const healthResponse = await fetch(`${serverUrl}/health`);
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toEqual({
      ok: true,
      data: { status: "ready" },
    });

    const pageResponse = await fetch(serverUrl);
    expect(pageResponse.status).toBe(200);
    expect(pageResponse.headers.get("content-type")).toContain("text/html");
    const html = await pageResponse.text();
    expect(html).toContain('<div id="lingo-root"></div>');

    const scriptPath = html.match(/<script[^>]+src="([^"]+)"/i)?.[1];
    expect(scriptPath).toStartWith("/assets/");
    const scriptResponse = await fetch(new URL(scriptPath ?? "", serverUrl));
    expect(scriptResponse.status).toBe(200);
    expect(scriptResponse.headers.get("content-type")).toContain("javascript");
    expect(scriptResponse.headers.get("cache-control")).toContain("immutable");

    const workspaceResponse = await fetch(`${serverUrl}/api/workspace`);
    expect(workspaceResponse.status).toBe(200);
    expect(await workspaceResponse.json()).toEqual({
      ok: true,
      data: { notes: [], prompts: [] },
    });
    expect(existsSync(join(home, ".lingo", "lingo.sqlite"))).toBe(true);
  } finally {
    child.kill();
    await child.exited;
    rmSync(home, { recursive: true, force: true });
  }
}, 15_000);
