import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const hostname = "127.0.0.1";
const backendPort = Number(Bun.env.LINGO_PORT ?? "4312");
const uiPort = Number(Bun.env.LINGO_UI_PORT ?? "5173");
const backendUrl = `http://${hostname}:${backendPort}`;
const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

const assertPort = (port: number, name: string) => {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
};

const backendIsReady = async () => {
  try {
    const response = await fetch(`${backendUrl}/health`);
    if (!response.ok) return false;
    const body = (await response.json()) as {
      readonly ok?: boolean;
      readonly data?: { readonly status?: string };
    };
    return body.ok === true && body.data?.status === "ready";
  } catch {
    return false;
  }
};

const waitForBackend = async () => {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (await backendIsReady()) return;
    await Bun.sleep(50);
  }
  throw new Error(`Local API server did not start at ${backendUrl}.`);
};

const run = async () => {
  assertPort(backendPort, "LINGO_PORT");
  assertPort(uiPort, "LINGO_UI_PORT");

  let backend: ReturnType<typeof Bun.spawn> | undefined;
  let vite: ReturnType<typeof Bun.spawn> | undefined;

  const stop = () => {
    vite?.kill();
    backend?.kill();
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    if (!(await backendIsReady())) {
      backend = Bun.spawn(["bun", "run", "src/cli.ts", "start"], {
        cwd: projectRoot,
        env: { ...Bun.env, LINGO_API_ONLY: "1" },
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
      await waitForBackend();
    }

    vite = Bun.spawn(
      ["bun", "x", "vite", "--port", String(uiPort), "--strictPort"],
      {
        cwd: projectRoot,
        env: { ...Bun.env, LINGO_PORT: String(backendPort) },
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      },
    );

    return await vite.exited;
  } finally {
    stop();
    if (vite) await vite.exited;
    if (backend) await backend.exited;
  }
};

try {
  process.exitCode = await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not start UI development servers.");
  process.exitCode = 1;
}
