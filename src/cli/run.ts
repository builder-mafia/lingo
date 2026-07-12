import { Effect } from "effect";

import { Database } from "../layers/database";
import { JsonInput, type JsonInputOptions } from "../layers/json-input";
import { errorResponse, CliError } from "./errors";
import { createNote } from "./commands/create-note";
import { validateMultipleChoiceProblem } from "./commands/validate-multiple-choice";

const multipleChoiceUsage =
  "Usage: lingo problem multiple-choice validate (--data <json> | --data-file <path>)";
const noteCreateUsage = "Usage: lingo note create";

const parseInputOptions = (args: readonly string[]): Effect.Effect<JsonInputOptions, CliError> => {
  let data: string | undefined;
  let dataFile: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];

    if (argument === "--data") {
      if (value === undefined) {
        return Effect.fail(new CliError(multipleChoiceUsage));
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
        return Effect.fail(new CliError(multipleChoiceUsage));
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

    return Effect.fail(new CliError(multipleChoiceUsage));
  }

  return Effect.succeed({ data, dataFile });
};

export const runCli = (
  args: readonly string[],
): Effect.Effect<number, never, JsonInput | Database> => {
  const [resource, type, action, ...inputArgs] = args;

  if (resource === "note" && type === "create" && action === undefined) {
    return createNote().pipe(
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
  }

  if (
    resource !== "problem" ||
    type !== "multiple-choice" ||
    action !== "validate"
  ) {
    console.error(
      errorResponse(
        new CliError(resource === "note" ? noteCreateUsage : multipleChoiceUsage),
      ),
    );
    return Effect.succeed(1);
  }

  return parseInputOptions(inputArgs).pipe(
    Effect.flatMap(validateMultipleChoiceProblem),
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
