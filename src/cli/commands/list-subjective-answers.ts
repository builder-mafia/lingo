import { Effect } from "effect";

import { Database, type UnevaluatedSubjectiveAnswer } from "../../layers/database";
import { noteIdSchema } from "../../schemas/note";
import { CliError } from "../errors";

export const listSubjectiveAnswers = (
  noteId: string,
): Effect.Effect<readonly UnevaluatedSubjectiveAnswer[], CliError, Database> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) return yield* Effect.fail(new CliError("Invalid note identifier."));
    return yield* (yield* Database).listUnevaluatedSubjectiveAnswers(parsedNoteId.data);
  });
