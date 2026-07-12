#!/usr/bin/env bun
import { runCli } from "./cli/run";
import { errorResponse, CliError } from "./cli/errors";
import { AppRuntime } from "./runtime";

const run = async () => {
  try {
    return await AppRuntime.runPromise(runCli(Bun.argv.slice(2)));
  } catch {
    console.error(errorResponse(new CliError("Could not run CLI.")));
    return 1;
  } finally {
    await AppRuntime.dispose();
  }
};

process.exit(await run());
