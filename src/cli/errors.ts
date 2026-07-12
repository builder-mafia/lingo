export class CliInputError extends Error {
  readonly _tag = "CliInputError";

  constructor(
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

export const errorResponse = (error: CliInputError) =>
  JSON.stringify({
    ok: false,
    error: {
      code: error._tag,
      message: error.message,
      details: error.details,
    },
  });
