import { Effect } from "effect";

import { SelfUpdater } from "../../layers/self-updater";
import {
  selfUpdateResultSchema,
  type SelfUpdateResult,
} from "../../schemas/self-update";
import { CliError } from "../errors";

export const updateCli = (): Effect.Effect<
  SelfUpdateResult,
  CliError,
  SelfUpdater
> =>
  Effect.gen(function* () {
    const result = yield* (yield* SelfUpdater).update();
    return selfUpdateResultSchema.parse(result);
  });
