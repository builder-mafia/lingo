import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { noteIdSchema } from "../../schemas/note";
import {
  createNoteRelationSchema,
  noteRelationSchema,
  type NoteRelation,
} from "../../schemas/note-relation";
import { CliError } from "../errors";

export const addNoteRelation = (
  noteId: string,
  inputOptions: JsonInputOptions,
): Effect.Effect<NoteRelation, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const parsedNoteId = noteIdSchema.safeParse(noteId);
    if (!parsedNoteId.success) {
      return yield* Effect.fail(new CliError("Invalid note identifier."));
    }

    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsedInput = createNoteRelationSchema.safeParse(input);
    if (!parsedInput.success) {
      return yield* Effect.fail(new CliError("Invalid note relation."));
    }

    const relation = yield* (yield* Database).addNoteRelation(
      parsedNoteId.data,
      parsedInput.data.targetNoteId,
    );
    return noteRelationSchema.parse(relation);
  });
