import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { noteIdSchema } from "../../schemas/note";
import { noteSummarySchema, setNoteSummarySchema, type NoteSummary } from "../../schemas/note-summary";
import { CliError } from "../errors";

const validateSummaryInput = (input: unknown): Effect.Effect<string, CliError> => {
  const parsed = setNoteSummarySchema.safeParse(input);
  return parsed.success
    ? Effect.succeed(parsed.data.content)
    : Effect.fail(new CliError("Invalid note summary."));
};

export const setNoteSummary = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<NoteSummary, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const jsonInput = yield* JsonInput;
    const content = yield* jsonInput.read(inputOptions).pipe(
      Effect.flatMap(validateSummaryInput),
    );
    const database = yield* Database;
    const summary = yield* database.setNoteSummary(parsedNoteId.data, content);

    return noteSummarySchema.parse(summary);
  });
