import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { noteIdSchema } from "../../schemas/note";
import { setSubjectiveEvaluationSchema } from "../../schemas/subjective-evaluation";
import { CliError } from "../errors";

export const setSubjectiveEvaluation = (
  questionId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<{ readonly questionId: string; readonly feedback: string }, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedQuestionId = noteIdSchema.safeParse(questionId);
    if (!parsedQuestionId.success) return yield* Effect.fail(new CliError("Invalid subjective question identifier."));
    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsed = setSubjectiveEvaluationSchema.safeParse(input);
    if (!parsed.success) return yield* Effect.fail(new CliError("Invalid subjective evaluation."));
    return yield* (yield* Database).setSubjectiveEvaluation(parsedQuestionId.data, parsed.data.feedback);
  });
