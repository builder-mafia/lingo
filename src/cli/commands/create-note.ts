import { Effect } from "effect";

import { CliError } from "../errors";
import { Database } from "../../layers/database";

export type CreatedNote = {
  readonly noteId: string;
  readonly createdAt: string;
  readonly noteUrl: string;
};

const localNoteUrl = (noteId: string) =>
  `http://127.0.0.1:4312/notes/${noteId}`;

export const createNote = (): Effect.Effect<CreatedNote, CliError, Database> =>
  Effect.gen(function* () {
    const database = yield* Database;
    const note = yield* database.createNote();

    return {
      noteId: note.id,
      createdAt: note.createdAt,
      noteUrl: localNoteUrl(note.id),
    };
  });
