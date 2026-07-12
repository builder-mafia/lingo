import { Layer, ManagedRuntime } from "effect";

import { JsonInputLive } from "./layers/json-input";

const AppLayer = Layer.mergeAll(JsonInputLive);

export const AppRuntime = ManagedRuntime.make(AppLayer);
