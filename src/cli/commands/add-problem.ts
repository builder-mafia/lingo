import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { createMultipleChoiceProblemSchema } from "../../schemas/multiple-choice";
import { noteIdSchema } from "../../schemas/note";
import { createSubjectiveProblemSchema } from "../../schemas/subjective";
import { CliError } from "../errors";

export const addProblem = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<
  { readonly problemId: string; readonly noteId: string; readonly correctId?: number },
  CliError,
  Database | JsonInput
> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) return yield* Effect.fail(new CliError("Invalid note identifier."));

    const input = yield* (yield* JsonInput).read(inputOptions);
    const multipleChoice = createMultipleChoiceProblemSchema.safeParse(input);
    if (multipleChoice.success) {
      return yield* (yield* Database).addMultipleChoiceProblem(parsedNoteId.data, multipleChoice.data);
    }

    const subjective = createSubjectiveProblemSchema.safeParse(input);
    if (subjective.success) {
      return yield* (yield* Database).addSubjectiveProblem(parsedNoteId.data, subjective.data);
    }

    return yield* Effect.fail(new CliError("Invalid problem."));
  });
