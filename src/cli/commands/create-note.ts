import { Effect } from "effect";

import { CliError } from "../errors";
import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { createNoteSchema } from "../../schemas/note";

export type CreatedNote = {
  readonly noteId: string;
  readonly title: string;
  readonly labels: readonly string[];
  readonly createdAt: string;
  readonly noteUrl: string;
};

const localNoteUrl = (noteId: string) =>
  `http://127.0.0.1:4312/notes/${noteId}`;

export const createNote = (
  inputOptions: JsonInputOptions,
): Effect.Effect<CreatedNote, CliError, Database | JsonInput> =>
  Effect.gen(function* () {
    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsed = createNoteSchema.safeParse(input);
    if (!parsed.success) {
      return yield* Effect.fail(new CliError("Invalid note."));
    }

    const database = yield* Database;
    const note = yield* database.createNote(parsed.data);

    return {
      noteId: note.id,
      title: note.title,
      labels: note.labels,
      createdAt: note.createdAt,
      noteUrl: localNoteUrl(note.id),
    };
  });
