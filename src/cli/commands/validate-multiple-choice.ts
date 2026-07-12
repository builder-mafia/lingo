import { Effect } from "effect";

import {
  createMultipleChoiceProblemSchema,
  type CreateMultipleChoiceProblem,
} from "../../schemas/multiple-choice";
import { CliInputError } from "../errors";
import { readJsonInput, type JsonInputOptions } from "../input";

const validateProblem = (
  input: unknown,
): Effect.Effect<CreateMultipleChoiceProblem, CliInputError> => {
  const parsed = createMultipleChoiceProblemSchema.safeParse(input);

  return parsed.success
    ? Effect.succeed(parsed.data)
    : Effect.fail(new CliInputError("Invalid multiple-choice problem.", parsed.error.issues));
};

export const validateMultipleChoiceProblem = (
  inputOptions: JsonInputOptions,
): Effect.Effect<CreateMultipleChoiceProblem, CliInputError> =>
  readJsonInput(inputOptions).pipe(Effect.flatMap(validateProblem));
