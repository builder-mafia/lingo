import { Effect } from "effect";

import { Database } from "../../layers/database";
import { noteContentSchema, type NoteContent } from "../../schemas/note-content";
import { noteIdSchema } from "../../schemas/note";
import { CliError } from "../errors";

export const getNoteContent = (
  noteId: string,
): Effect.Effect<NoteContent, CliError, Database> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const content = yield* (yield* Database).findNoteContent(parsedNoteId.data);
    if (!content) {
      return yield* Effect.fail(new CliError("Could not read note content."));
    }

    return noteContentSchema.parse(content);
  });
