# Self-review — initial Lingo CLI

## Reviewed scope

- `main...feat/initial-lingo` pull request diff
- Current local follow-up changes for architecture guidance and Effect layering

## Findings and actions

1. **Fixed — duplicate input flags were silently overwritten.**
   - `--data <json> --data <json>` previously accepted the final value.
   - The CLI now rejects duplicate `--data` or duplicate `--data-file` flags with the coarse `CliError` response.
   - A regression test covers this behavior.

2. **Fixed — reusable Effect I/O was embedded in the CLI folder.**
   - JSON string/file reading is now the `JsonInput` Effect service with `JsonInputLive` in `src/layers/json-input.ts`.
   - Commands depend on the `JsonInput` service interface and `runCli` provides the live layer.
   - A Layer-level test verifies the service contract.

3. **Fixed — error type was narrower than the application boundary.**
   - Replaced `CliInputError` with coarse-grained `CliError`.
   - Messages and optional details still give CLI users actionable feedback without forcing callers to branch on many fine-grained error variants.

4. **Checked — security and input boundaries.**
   - No secrets, shell execution, dynamic code evaluation, or external AI/provider credentials are included.
   - JSON is parsed then validated by the multiple-choice Zod schema.

## Remaining scope, not a defect

- Note persistence, SQLite, localhost browser UI, subjective problems, answers, and evaluations are intentionally future work.
- Future reusable I/O services (SQLite repository, local server, CLI output) should follow the same `src/layers/` interface + Live Layer pattern when they are introduced.
