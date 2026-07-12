import { join } from "node:path";
import { Layer, ManagedRuntime } from "effect";

import { makeDatabaseLayer } from "./layers/database";
import { JsonInputLive } from "./layers/json-input";

const databasePath = join(Bun.env.HOME ?? ".", ".lingo", "lingo.sqlite");
const AppLayer = Layer.mergeAll(JsonInputLive, makeDatabaseLayer(databasePath));

export const AppRuntime = ManagedRuntime.make(AppLayer);
