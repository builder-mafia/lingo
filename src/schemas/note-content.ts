import { z } from "zod";

import { noteIdSchema } from "./note";

export { noteIdSchema } from "./note";

export const setNoteContentSchema = z.object({
  content: z.string().trim().min(1),
});

export const noteContentSchema = z.object({
  noteId: noteIdSchema,
  content: z.string().trim().min(1),
  updatedAt: z.string().datetime(),
});

export type SetNoteContent = z.infer<typeof setNoteContentSchema>;
export type NoteContent = z.infer<typeof noteContentSchema>;
