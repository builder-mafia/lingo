import { Effect } from "effect";

import {
  createMultipleChoiceProblemSchema,
  type CreateMultipleChoiceProblem,
} from "../../schemas/multiple-choice";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { CliError } from "../errors";

export const parseMultipleChoiceProblem = (
  input: unknown,
): Effect.Effect<CreateMultipleChoiceProblem, CliError> => {
  const parsed = createMultipleChoiceProblemSchema.safeParse(input);

  return parsed.success
    ? Effect.succeed(parsed.data)
    : Effect.fail(new CliError("Invalid multiple-choice problem."));
};

export const validateMultipleChoiceProblem = (
  inputOptions: JsonInputOptions,
): Effect.Effect<CreateMultipleChoiceProblem, CliError, JsonInput> =>
  Effect.gen(function* () {
    const jsonInput = yield* JsonInput;
    const input = yield* jsonInput.read(inputOptions);
    return yield* parseMultipleChoiceProblem(input);
  });
