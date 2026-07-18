#!/usr/bin/env bun
import { runCliMain } from "./cli-main";
import { AppRuntime } from "./runtime";

process.exit(await runCliMain(Bun.argv.slice(2), AppRuntime));
