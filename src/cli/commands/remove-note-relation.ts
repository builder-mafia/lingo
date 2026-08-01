import { Effect } from "effect";

import { Database } from "../../layers/database";
import { noteRelationIdSchema } from "../../schemas/note-relation";
import { CliError } from "../errors";

export const removeNoteRelation = (
  relationId: string,
): Effect.Effect<
  { readonly relationId: string; readonly removed: true },
  CliError,
  Database
> =>
  Effect.gen(function* () {
    const parsedRelationId = noteRelationIdSchema.safeParse(relationId);
    if (!parsedRelationId.success) {
      return yield* Effect.fail(new CliError("Invalid relation identifier."));
    }

    return yield* (yield* Database).removeNoteRelation(parsedRelationId.data);
  });
