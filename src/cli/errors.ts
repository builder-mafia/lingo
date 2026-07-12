export class CliError extends Error {
  readonly _tag = "CliError";

  constructor(
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

export const errorResponse = (error: CliError) =>
  JSON.stringify({
    ok: false,
    error: {
      code: error._tag,
      message: error.message,
      details: error.details,
    },
  });
