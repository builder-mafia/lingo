import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Layer, ManagedRuntime } from "effect";

import { makeDatabaseLayer } from "./layers/database";
import { JsonInputLive } from "./layers/json-input";
import { makeLocalHttpServerLayer } from "./layers/local-http-server";
import {
  SelfUpdater,
  makeSelfUpdaterLayer,
  type SelfUpdaterService,
} from "./layers/self-updater";
import {
  makeDiskWebAssets,
  type WebAssets,
} from "./server/web-assets";
import { isStandaloneBuild } from "./standalone";
import { lingoVersion } from "./version";

const databasePath = join(Bun.env.HOME ?? ".", ".lingo", "lingo.sqlite");
const localServerPort = Number(Bun.env.LINGO_PORT ?? "4312");
const webRootPath = fileURLToPath(new URL("../dist/ui", import.meta.url));

export type AppRuntimeConfig = {
  readonly webAssets?: WebAssets;
  readonly selfUpdater?: SelfUpdaterService;
};

export const makeAppRuntime = (config: AppRuntimeConfig = {}) => {
  const DatabaseLive = makeDatabaseLayer(databasePath);
  const LocalHttpServerLive = makeLocalHttpServerLayer({
    hostname: "127.0.0.1",
    port: localServerPort,
    webAssets: config.webAssets ?? makeDiskWebAssets(webRootPath),
    requireWebAssets: Bun.env.LINGO_API_ONLY !== "1",
  }).pipe(Layer.provide(DatabaseLive));
  const SelfUpdaterLive = config.selfUpdater
    ? Layer.succeed(SelfUpdater, config.selfUpdater)
    : makeSelfUpdaterLayer({
        architecture: process.arch,
        currentVersion: lingoVersion,
        executablePath: process.execPath,
        fetch: (url, init) => fetch(url, init),
        platform: process.platform,
        standalone: isStandaloneBuild,
      });
  const AppLayer = Layer.mergeAll(
    JsonInputLive,
    DatabaseLive,
    LocalHttpServerLive,
    SelfUpdaterLive,
  );

  return ManagedRuntime.make(AppLayer);
};

export const AppRuntime = makeAppRuntime();
