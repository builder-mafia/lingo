import { Effect } from "effect";

import { Database } from "../../layers/database";
import { noteIdSchema } from "../../schemas/note";
import {
  noteSourceListSchema,
  type NoteSourceList,
} from "../../schemas/note-source";
import { CliError } from "../errors";

export const listNoteSources = (
  noteId: string,
): Effect.Effect<NoteSourceList, CliError, Database> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const sources = yield* (yield* Database).listNoteSources(parsedNoteId.data);
    return noteSourceListSchema.parse(sources);
  });
