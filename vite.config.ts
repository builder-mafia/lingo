import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const uiRoot = resolve(import.meta.dirname, "src/ui");

export default defineConfig(() => {
  const localServerPort = Number(process.env.LINGO_PORT ?? "4312");

  return {
    root: uiRoot,
    plugins: [react()],
    build: {
      emptyOutDir: true,
      outDir: resolve(import.meta.dirname, "dist/ui"),
    },
    server: {
      host: "127.0.0.1",
      proxy: {
        "/api": `http://127.0.0.1:${localServerPort}`,
        "/health": `http://127.0.0.1:${localServerPort}`,
      },
    },
  };
});
