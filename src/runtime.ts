import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Layer, ManagedRuntime } from "effect";

import { makeDatabaseLayer } from "./layers/database";
import { JsonInputLive } from "./layers/json-input";
import { makeLocalHttpServerLayer } from "./layers/local-http-server";

const databasePath = join(Bun.env.HOME ?? ".", ".lingo", "lingo.sqlite");
const localServerPort = Number(Bun.env.LINGO_PORT ?? "4312");
const webRootPath = fileURLToPath(new URL("../dist/ui", import.meta.url));
const DatabaseLive = makeDatabaseLayer(databasePath);
const LocalHttpServerLive = makeLocalHttpServerLayer({
  hostname: "127.0.0.1",
  port: localServerPort,
  webRootPath,
  requireWebAssets: Bun.env.LINGO_API_ONLY !== "1",
}).pipe(Layer.provide(DatabaseLive));
const AppLayer = Layer.mergeAll(
  JsonInputLive,
  DatabaseLive,
  LocalHttpServerLive,
);

export const AppRuntime = ManagedRuntime.make(AppLayer);
