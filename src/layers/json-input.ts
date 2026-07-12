import { Context, Effect, Layer } from "effect";

import { CliError } from "../cli/errors";

export type JsonInputOptions = {
  readonly data?: string;
  readonly dataFile?: string;
};

export interface JsonInputService {
  readonly read: (
    options: JsonInputOptions,
  ) => Effect.Effect<unknown, CliError>;
}

export class JsonInput extends Context.Tag("@lingo/JsonInput")<
  JsonInput,
  JsonInputService
>() {}

const parseJson = (value: string): Effect.Effect<unknown, CliError> =>
  Effect.try({
    try: () => JSON.parse(value),
    catch: () => new CliError("Input must be valid JSON."),
  });

const read = ({
  data,
  dataFile,
}: JsonInputOptions): Effect.Effect<unknown, CliError> => {
  if (data && dataFile) {
    return Effect.fail(
      new CliError("Use either --data or --data-file, not both."),
    );
  }

  if (data) {
    return parseJson(data);
  }

  if (dataFile) {
    return Effect.tryPromise({
      try: () => Bun.file(dataFile).text(),
      catch: () => new CliError(`Could not read JSON file: ${dataFile}`),
    }).pipe(Effect.flatMap(parseJson));
  }

  return Effect.fail(
    new CliError("Either --data or --data-file is required."),
  );
};

export const JsonInputLive = Layer.succeed(JsonInput, { read });
