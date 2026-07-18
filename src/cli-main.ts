import { CliError, errorResponse } from "./cli/errors";
import { runCli } from "./cli/run";
import type { makeAppRuntime } from "./runtime";

type AppRuntime = ReturnType<typeof makeAppRuntime>;

export const runCliMain = async (
  args: readonly string[],
  runtime: AppRuntime,
) => {
  try {
    return await runtime.runPromise(runCli(args));
  } catch {
    console.error(errorResponse(new CliError("Could not run CLI.")));
    return 1;
  } finally {
    await runtime.dispose();
  }
};
