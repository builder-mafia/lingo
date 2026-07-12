import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { noteIdSchema } from "../../schemas/note";
import { createSubjectiveProblemSchema } from "../../schemas/subjective";
import { CliError } from "../errors";

export const addNoteSubjectiveProblem = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<{ readonly problemId: string; readonly noteId: string }, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) return yield* Effect.fail(new CliError("Invalid note identifier."));
    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsed = createSubjectiveProblemSchema.safeParse(input);
    if (!parsed.success) return yield* Effect.fail(new CliError("Invalid subjective problem."));
    return yield* (yield* Database).addSubjectiveProblem(parsedNoteId.data, parsed.data);
  });
