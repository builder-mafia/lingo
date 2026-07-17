import { expect, test } from "bun:test";
import { createServer } from "node:net";

const cliPath = new URL("../../src/cli.ts", import.meta.url).pathname;
const projectRoot = new URL("../..", import.meta.url).pathname;

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

  const child = Bun.spawn(["bun", "run", cliPath, "start"], {
    cwd: projectRoot,
    env: { ...process.env, LINGO_PORT: String(port) },
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
  } finally {
    child.kill();
    await child.exited;
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
