#!/usr/bin/env bun
import { runCli } from "./cli/run";
import { AppRuntime } from "./runtime";

const exitCode = await AppRuntime.runPromise(runCli(Bun.argv.slice(2)));
process.exit(exitCode);
