import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import {
  noteMemoStateSchema,
  setNoteMemoSchema,
  type NoteMemoState,
} from "../../schemas/note-memo";
import { noteIdSchema } from "../../schemas/note";
import { CliError } from "../errors";

export const setNoteMemo = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<NoteMemoState, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsedInput = setNoteMemoSchema.safeParse(input);
    if (!parsedInput.success) {
      return yield* Effect.fail(new CliError("Invalid note memo."));
    }

    const stored = yield* (yield* Database).setNoteMemo(
      parsedNoteId.data,
      parsedInput.data.content,
    );
    return noteMemoStateSchema.parse(stored);
  });
