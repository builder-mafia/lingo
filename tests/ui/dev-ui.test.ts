import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });

const waitForWorkspace = async (url: string) => {
  const deadline = Date.now() + 8_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/workspace`);
      if (response.ok) return response;
    } catch {
      // The two development servers may still be starting.
    }
    await Bun.sleep(50);
  }

  throw new Error("Development UI did not expose the local API in time.");
};

test("dev:ui starts Vite with its local API backend", async () => {
  const home = mkdtempSync(join(tmpdir(), "lingo-dev-ui-"));
  const backendPort = await findAvailablePort();
  let uiPort = await findAvailablePort();
  while (uiPort === backendPort) uiPort = await findAvailablePort();

  const child = Bun.spawn(["bun", "run", "dev:ui"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HOME: home,
      LINGO_PORT: String(backendPort),
      LINGO_UI_PORT: String(uiPort),
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  try {
    const response = await waitForWorkspace(`http://127.0.0.1:${uiPort}`);
    expect(await response.json()).toEqual({
      ok: true,
      data: { notes: [] },
    });
  } finally {
    child.kill();
    await child.exited;
    rmSync(home, { recursive: true, force: true });
  }
}, 15_000);
