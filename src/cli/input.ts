import { Effect } from "effect";

import { CliInputError } from "./errors";

export type JsonInputOptions = {
  readonly data?: string;
  readonly dataFile?: string;
};

const parseJson = (value: string): Effect.Effect<unknown, CliInputError> =>
  Effect.try({
    try: () => JSON.parse(value),
    catch: () => new CliInputError("Input must be valid JSON."),
  });

export const readJsonInput = ({
  data,
  dataFile,
}: JsonInputOptions): Effect.Effect<unknown, CliInputError> => {
  if (data && dataFile) {
    return Effect.fail(
      new CliInputError("Use either --data or --data-file, not both."),
    );
  }

  if (data) {
    return parseJson(data);
  }

  if (dataFile) {
    return Effect.tryPromise({
      try: () => Bun.file(dataFile).text(),
      catch: () => new CliInputError(`Could not read JSON file: ${dataFile}`),
    }).pipe(Effect.flatMap(parseJson));
  }

  return Effect.fail(
    new CliInputError("Either --data or --data-file is required."),
  );
};
