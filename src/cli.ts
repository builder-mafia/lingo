#!/usr/bin/env bun
import { Effect } from "effect";

import { runCli } from "./cli/run";

const exitCode = await Effect.runPromise(runCli(Bun.argv.slice(2)));
process.exit(exitCode);
