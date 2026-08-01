import { Effect } from "effect";

import { Database } from "../../layers/database";
import { noteSourceIdSchema } from "../../schemas/note-source";
import { CliError } from "../errors";

export const removeNoteSource = (
  sourceId: string,
): Effect.Effect<
  { readonly sourceId: string; readonly removed: true },
  CliError,
  Database
> =>
  Effect.gen(function* () {
    const parsedSourceId = noteSourceIdSchema.safeParse(sourceId);
    if (!parsedSourceId.success) {
      return yield* Effect.fail(new CliError("Invalid source identifier."));
    }

    return yield* (yield* Database).removeNoteSource(parsedSourceId.data);
  });
