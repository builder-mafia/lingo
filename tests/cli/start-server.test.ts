import { beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

beforeAll(async () => {
  const build = Bun.spawn(["bun", "run", "build:ui"], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stderr] = await Promise.all([
    build.exited,
    new Response(build.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(`Could not build test UI assets.\n${stderr}`);
  }
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

test("lingo start serves the local health endpoint", async () => {
  const port = await findAvailablePort();
  const home = mkdtempSync(join(tmpdir(), "lingo-start-test-"));

  const child = Bun.spawn(["bun", "run", cliPath, "start"], {
    cwd: projectRoot,
    env: { ...process.env, HOME: home, LINGO_PORT: String(port) },
    stdout: "pipe",
    stderr: "pipe",
  });

  try {
    const line = await Promise.race([
      readLine(child.stdout),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Server did not start in time.")), 3_000),
      ),
    ]);
    const started = JSON.parse(line);

    expect(started).toEqual({
      ok: true,
      data: {
        serverUrl: `http://127.0.0.1:${port}`,
      },
    });

    const response = await fetch(`${started.data.serverUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { status: "ready" },
    });

    const workspaceResponse = await fetch(
      `${started.data.serverUrl}/api/workspace`,
    );
    expect(workspaceResponse.status).toBe(200);
    expect(await workspaceResponse.json()).toEqual({
      ok: true,
      data: { notes: [] },
    });

    const pageResponse = await fetch(started.data.serverUrl);
    expect(pageResponse.status).toBe(200);
    expect(pageResponse.headers.get("content-type")).toContain("text/html");

    const html = await pageResponse.text();
    expect(html).toContain('<div id="lingo-root"></div>');

    const deepLinkResponse = await fetch(
      `${started.data.serverUrl}/notes/example-note/session`,
    );
    expect(deepLinkResponse.status).toBe(200);
    expect(deepLinkResponse.headers.get("content-type")).toContain("text/html");
    expect(await deepLinkResponse.text()).toBe(html);

    const missingApiResponse = await fetch(`${started.data.serverUrl}/api/missing`);
    expect(missingApiResponse.status).toBe(404);
    expect(missingApiResponse.headers.get("content-type")).toContain(
      "application/json",
    );

    const missingAssetResponse = await fetch(
      `${started.data.serverUrl}/assets/missing.js`,
    );
    expect(missingAssetResponse.status).toBe(404);
    expect(missingAssetResponse.headers.get("content-type")).toContain(
      "application/json",
    );

    const scriptPath = html.match(/<script[^>]+src="([^"]+)"/i)?.[1];
    const stylePaths = [
      ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi),
    ].map((match) => match[1]);
    expect(scriptPath).toBeDefined();
    expect(stylePaths.length).toBeGreaterThan(0);

    const [scriptResponse, ...styleResponses] = await Promise.all([
      fetch(new URL(scriptPath ?? "", started.data.serverUrl)),
      ...stylePaths.map((path) => fetch(new URL(path, started.data.serverUrl))),
    ]);
    expect(scriptResponse.status).toBe(200);
    expect(scriptResponse.headers.get("content-type")).toContain("javascript");
    expect(scriptResponse.headers.get("cache-control")).toContain("immutable");
    expect(scriptPath).toStartWith("/assets/");

    const styles: string[] = [];
    for (const styleResponse of styleResponses) {
      expect(styleResponse.status).toBe(200);
      expect(styleResponse.headers.get("content-type")).toContain("text/css");
      styles.push(await styleResponse.text());
    }
    expect(styles.join("\n")).toContain("--color-canvas");
  } finally {
    child.kill();
    await child.exited;
    rmSync(home, { recursive: true, force: true });
  }
});

test("lingo start reports a structured error for an invalid server port", async () => {
  const child = Bun.spawn(["bun", "run", cliPath, "start"], {
    cwd: projectRoot,
    env: { ...process.env, LINGO_PORT: "invalid" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stderr] = await Promise.all([
    child.exited,
    new Response(child.stderr).text(),
  ]);

  expect(exitCode).toBe(1);
  expect(JSON.parse(stderr)).toEqual({
    ok: false,
    error: {
      code: "CliError",
      message: "Could not start local server.",
      details: [],
    },
  });
});
