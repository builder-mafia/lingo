import { Context, Effect, Layer, Scope } from "effect";
import { rmSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import postcss from "postcss";
import postcssModules from "postcss-modules";

import { CliError } from "../cli/errors";

export type LocalHttpServerConfig = {
  readonly hostname: "127.0.0.1";
  readonly port: number;
};

export type LocalHttpServerAddress = {
  readonly serverUrl: string;
};

export interface LocalHttpServerService {
  readonly listen: Effect.Effect<
    LocalHttpServerAddress,
    CliError,
    Scope.Scope
  >;
}

export class LocalHttpServer extends Context.Tag("@lingo/LocalHttpServer")<
  LocalHttpServer,
  LocalHttpServerService
>() {}

type WebAppBundle = {
  readonly assets: ReadonlyMap<string, Blob>;
  readonly indexHtml: string;
};

const makeCssModulesPlugin = (cssAssets: Map<string, Blob>): Bun.BunPlugin => ({
  name: "lingo-css-modules",
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, async ({ path }) => {
      const source = await Bun.file(path).text();
      let classes: Record<string, string> = {};
      const result = await postcss([
        postcssModules({
          generateScopedName: (name, filename) =>
            `${basename(filename, ".module.css")}_${name}`,
          getJSON: (_, json) => {
            classes = json;
          },
        }),
      ]).process(source, { from: path });

      cssAssets.set(
        `/assets/${basename(path)}`,
        new Blob([result.css], { type: "text/css; charset=utf-8" }),
      );

      return {
        contents: `export default ${JSON.stringify(classes)};`,
        loader: "js",
      };
    });
  },
});

const contentTypeFor = (path: string) =>
  path.endsWith(".css")
    ? "text/css; charset=utf-8"
    : "text/javascript; charset=utf-8";

const buildWebApp = async (outdir: string): Promise<WebAppBundle> => {
  const cssAssets = new Map<string, Blob>();
  const result = await Bun.build({
    entrypoints: [new URL("../ui/index.tsx", import.meta.url).pathname],
    outdir,
    target: "browser",
    minify: true,
    plugins: [makeCssModulesPlugin(cssAssets)],
    naming: {
      entry: "app.[ext]",
      asset: "[name].[ext]",
    },
  });

  if (!result.success) {
    throw new Error("Could not build browser application.");
  }

  const assets = new Map<string, Blob>(cssAssets);
  for (const output of result.outputs) {
    assets.set(`/assets/${basename(output.path)}`, output);
  }
  assets.set(
    "/assets/global.css",
    Bun.file(new URL("../ui/styles/global.css", import.meta.url).pathname),
  );

  const scriptPath = [...assets.keys()].find((path) => path.endsWith(".js"));
  const stylePaths = [
    "/assets/global.css",
    ...[...cssAssets.keys()].toSorted(),
  ];
  if (scriptPath === undefined) {
    throw new Error("Browser application script was not generated.");
  }

  return {
    assets,
    indexHtml: `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f8f7f4" />
    <meta name="description" content="배운 것을 나의 언어로 만드는 사고 도구, Lingo" />
    <title>Lingo — 배운 것을, 나의 언어로</title>
    ${stylePaths.map((path) => `<link rel="stylesheet" href="${path}" />`).join("\n    ")}
  </head>
  <body>
    <div id="lingo-root"></div>
    <script type="module" src="${scriptPath}"></script>
  </body>
</html>`,
  };
};

const makeRequestHandler = (webApp: WebAppBundle) => (request: Request) => {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return Response.json({ ok: true, data: { status: "ready" } });
  }

  if (request.method === "GET" && url.pathname === "/") {
    return new Response(webApp.indexHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const asset = webApp.assets.get(url.pathname);
  if (request.method === "GET" && asset !== undefined) {
    return new Response(asset, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": contentTypeFor(url.pathname),
      },
    });
  }

  return Response.json(
    {
      ok: false,
      error: {
        code: "NotFound",
        message: "Route not found.",
        details: [],
      },
    },
    { status: 404 },
  );
};

const makeService = (
  config: LocalHttpServerConfig,
): LocalHttpServerService => ({
  listen: Effect.acquireRelease(
    Effect.tryPromise({
      try: async () => {
        if (
          !Number.isInteger(config.port) ||
          config.port < 1 ||
          config.port > 65_535
        ) {
          throw new Error("Invalid local server port.");
        }

        const buildDirectory = join(tmpdir(), "lingo-ui-build");

        try {
          rmSync(buildDirectory, { recursive: true, force: true });
          const webApp = await buildWebApp(buildDirectory);
          const server = Bun.serve({
            hostname: config.hostname,
            port: config.port,
            fetch: makeRequestHandler(webApp),
          });
          return { buildDirectory, server };
        } catch (error) {
          rmSync(buildDirectory, { recursive: true, force: true });
          throw error;
        }
      },
      catch: () => new CliError("Could not start local server."),
    }),
    ({ buildDirectory, server }) =>
      Effect.promise(() => Promise.resolve(server.stop(true))).pipe(
        Effect.ensuring(
          Effect.sync(() =>
            rmSync(buildDirectory, { recursive: true, force: true }),
          ),
        ),
        Effect.orDie,
      ),
  ).pipe(
    Effect.map(({ server }) => ({
      serverUrl: `http://${config.hostname}:${server.port}`,
    })),
  ),
});

export const makeLocalHttpServerLayer = (config: LocalHttpServerConfig) =>
  Layer.succeed(LocalHttpServer, makeService(config));
