import { join } from "node:path";
import { Layer, ManagedRuntime } from "effect";

import { makeDatabaseLayer } from "./layers/database";
import { JsonInputLive } from "./layers/json-input";
import { makeLocalHttpServerLayer } from "./layers/local-http-server";

const databasePath = join(Bun.env.HOME ?? ".", ".lingo", "lingo.sqlite");
const localServerPort = Number(Bun.env.LINGO_PORT ?? "4312");
const AppLayer = Layer.mergeAll(
  JsonInputLive,
  makeDatabaseLayer(databasePath),
  makeLocalHttpServerLayer({
    hostname: "127.0.0.1",
    port: localServerPort,
  }),
);

export const AppRuntime = ManagedRuntime.make(AppLayer);
