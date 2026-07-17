import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { join } from "node:path";

type LocalWebAppConfig = {
  readonly webRootPath: string;
};

const notFoundResponse = {
  ok: false,
  error: {
    code: "NotFound",
    message: "Route not found.",
    details: [],
  },
} as const;

export const makeLocalWebApp = ({ webRootPath }: LocalWebAppConfig) => {
  const app = new Hono();

  app.get("/health", (context) =>
    context.json({ ok: true, data: { status: "ready" } }),
  );

  app.get(
    "/assets/*",
    serveStatic({
      root: webRootPath,
      onFound: (_path, context) => {
        context.header("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
  app.all("/assets/*", (context) => context.json(notFoundResponse, 404));
  app.all("/api/*", (context) => context.json(notFoundResponse, 404));

  app.get(
    "*",
    serveStatic({
      root: "/",
      path: join(webRootPath, "index.html"),
      onFound: (_path, context) => {
        context.header("Cache-Control", "no-cache");
      },
    }),
  );

  app.notFound((context) => context.json(notFoundResponse, 404));

  return app;
};
