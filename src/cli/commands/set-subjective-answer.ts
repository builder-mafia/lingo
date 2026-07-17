import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { noteIdSchema } from "../../schemas/note";
import { setSubjectiveAnswerSchema } from "../../schemas/subjective-answer";
import { CliError } from "../errors";

export const setSubjectiveAnswer = (
  questionId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<{ readonly questionId: string; readonly content: string }, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedQuestionId = noteIdSchema.safeParse(questionId);
    if (!parsedQuestionId.success) return yield* Effect.fail(new CliError("Invalid subjective question identifier."));
    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsed = setSubjectiveAnswerSchema.safeParse(input);
    if (!parsed.success) return yield* Effect.fail(new CliError("Invalid subjective answer."));
    return yield* (yield* Database).setSubjectiveAnswer(parsedQuestionId.data, parsed.data.content);
  });
