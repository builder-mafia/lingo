import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { noteIdSchema } from "../../schemas/note";
import { setSubjectiveEvaluationSchema } from "../../schemas/subjective-evaluation";
import { CliError } from "../errors";

export const setSubjectiveEvaluation = (
  problemId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<{ readonly problemId: string; readonly feedback: string }, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedProblemId = noteIdSchema.safeParse(problemId);
    if (!parsedProblemId.success) return yield* Effect.fail(new CliError("Invalid subjective problem identifier."));
    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsed = setSubjectiveEvaluationSchema.safeParse(input);
    if (!parsed.success) return yield* Effect.fail(new CliError("Invalid subjective evaluation."));
    return yield* (yield* Database).setSubjectiveEvaluation(parsedProblemId.data, parsed.data.feedback);
  });
