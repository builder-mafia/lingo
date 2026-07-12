import { Effect } from "effect";

import { JsonInputLive, type JsonInputOptions } from "../layers/json-input";
import { errorResponse, CliError } from "./errors";
import { validateMultipleChoiceProblem } from "./commands/validate-multiple-choice";

const usage =
  "Usage: lingo problem multiple-choice validate (--data <json> | --data-file <path>)";

const parseInputOptions = (args: readonly string[]): Effect.Effect<JsonInputOptions, CliError> => {
  let data: string | undefined;
  let dataFile: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];

    if (argument === "--data") {
      if (value === undefined) {
        return Effect.fail(new CliError(usage));
      }

      if (data !== undefined) {
        return Effect.fail(new CliError("--data can only be provided once."));
      }

      data = value;
      index += 1;
      continue;
    }

    if (argument === "--data-file") {
      if (value === undefined) {
        return Effect.fail(new CliError(usage));
      }

      if (dataFile !== undefined) {
        return Effect.fail(
          new CliError("--data-file can only be provided once."),
        );
      }

      dataFile = value;
      index += 1;
      continue;
    }

    return Effect.fail(new CliError(usage));
  }

  return Effect.succeed({ data, dataFile });
};

export const runCli = (args: readonly string[]): Effect.Effect<number> => {
  const [resource, problemType, action, ...inputArgs] = args;

  if (
    resource !== "problem" ||
    problemType !== "multiple-choice" ||
    action !== "validate"
  ) {
    console.error(errorResponse(new CliError(usage)));
    return Effect.succeed(1);
  }

  return parseInputOptions(inputArgs).pipe(
    Effect.flatMap(validateMultipleChoiceProblem),
    Effect.provide(JsonInputLive),
    Effect.match({
      onFailure: (error) => {
        console.error(errorResponse(error));
        return 1;
      },
      onSuccess: (data) => {
        console.log(JSON.stringify({ ok: true, data }));
        return 0;
      },
    }),
  );
};
