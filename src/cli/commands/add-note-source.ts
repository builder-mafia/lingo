import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { noteIdSchema } from "../../schemas/note";
import {
  createNoteSourceSchema,
  noteSourceSchema,
  type NoteSource,
} from "../../schemas/note-source";
import { CliError } from "../errors";
import { SourceIconCache } from "../../layers/source-icon-cache";

export const addNoteSource = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<NoteSource, CliError, Database | JsonInput | SourceIconCache> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsedInput = createNoteSourceSchema.safeParse(input);
    if (!parsedInput.success) {
      return yield* Effect.fail(new CliError("Invalid note source."));
    }

    const source = yield* (yield* Database).addNoteSource(
      parsedNoteId.data,
      parsedInput.data,
    );
    yield* (yield* SourceIconCache).cacheUrl(source.url);
    return noteSourceSchema.parse(source);
  });
