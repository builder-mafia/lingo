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

export const addNoteSource = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<NoteSource, CliError, Database | JsonInput> =>
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
    return noteSourceSchema.parse(source);
  });
