import { Effect } from "effect";

import { Database } from "../../layers/database";
import { noteIdSchema } from "../../schemas/note";
import {
  noteRelationListSchema,
  type NoteRelationList,
} from "../../schemas/note-relation";
import { CliError } from "../errors";

export const listNoteRelations = (
  noteId: string,
): Effect.Effect<NoteRelationList, CliError, Database> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const relations = yield* (yield* Database).listNoteRelations(
      parsedNoteId.data,
    );
    return noteRelationListSchema.parse(relations);
  });
