import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { createMultipleChoiceQuestionSchema } from "../../schemas/multiple-choice";
import { noteIdSchema } from "../../schemas/note";
import { createSubjectiveQuestionSchema } from "../../schemas/subjective";
import { CliError } from "../errors";

export const addQuestion = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<
  { readonly questionId: string; readonly noteId: string; readonly correctId?: number },
  CliError,
  Database | JsonInput
> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) return yield* Effect.fail(new CliError("Invalid note identifier."));

    const input = yield* (yield* JsonInput).read(inputOptions);
    const multipleChoice = createMultipleChoiceQuestionSchema.safeParse(input);
    if (multipleChoice.success) {
      return yield* (yield* Database).addMultipleChoiceQuestion(parsedNoteId.data, multipleChoice.data);
    }

    const subjective = createSubjectiveQuestionSchema.safeParse(input);
    if (subjective.success) {
      return yield* (yield* Database).addSubjectiveQuestion(parsedNoteId.data, subjective.data);
    }

    return yield* Effect.fail(new CliError("Invalid question."));
  });
