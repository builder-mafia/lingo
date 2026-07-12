import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { parseMultipleChoiceProblem } from "./validate-multiple-choice";
import { noteIdSchema } from "../../schemas/note";
import { CliError } from "../errors";

export const addNoteMultipleChoiceProblem = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<
  { readonly problemId: string; readonly noteId: string; readonly correctId: number },
  CliError,
  Database | JsonInput
> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const input = yield* (yield* JsonInput).read(inputOptions);
    const problem = yield* parseMultipleChoiceProblem(input);
    return yield* (yield* Database).addMultipleChoiceProblem(parsedNoteId.data, problem);
  });
