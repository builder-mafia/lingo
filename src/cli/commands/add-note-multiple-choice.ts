import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import {
  createMultipleChoiceProblemSchema,
  type CreateMultipleChoiceProblem,
} from "../../schemas/multiple-choice";
import { noteIdSchema } from "../../schemas/note-summary";
import { CliError } from "../errors";

const validateProblem = (
  input: unknown,
): Effect.Effect<CreateMultipleChoiceProblem, CliError> => {
  const parsed = createMultipleChoiceProblemSchema.safeParse(input);
  return parsed.success
    ? Effect.succeed(parsed.data)
    : Effect.fail(new CliError("Invalid multiple-choice problem."));
};

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
    const problem = yield* validateProblem(input);
    return yield* (yield* Database).addMultipleChoiceProblem(parsedNoteId.data, problem);
  });
