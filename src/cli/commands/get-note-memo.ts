import { Effect } from "effect";

import { Database } from "../../layers/database";
import {
  noteMemoStateSchema,
  type NoteMemoState,
} from "../../schemas/note-memo";
import { noteIdSchema } from "../../schemas/note";
import { CliError } from "../errors";

export const getNoteMemo = (
  noteId: string,
): Effect.Effect<NoteMemoState, CliError, Database> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const state = yield* (yield* Database).findNoteMemo(parsedNoteId.data);
    return noteMemoStateSchema.parse(state);
  });
