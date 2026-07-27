import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import {
  noteContentSchema,
  setNoteContentSchema,
  type NoteContent,
} from "../../schemas/note-content";
import { noteIdSchema } from "../../schemas/note";
import { CliError } from "../errors";

const validateContentInput = (
  input: unknown,
): Effect.Effect<string, CliError> => {
  const parsed = setNoteContentSchema.safeParse(input);
  return parsed.success
    ? Effect.succeed(parsed.data.content)
    : Effect.fail(new CliError("Invalid note content."));
};

export const setNoteContent = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<NoteContent, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const jsonInput = yield* JsonInput;
    const content = yield* jsonInput.read(inputOptions).pipe(
      Effect.flatMap(validateContentInput),
    );
    const database = yield* Database;
    const stored = yield* database.setNoteContent(parsedNoteId.data, content);

    return noteContentSchema.parse(stored);
  });
