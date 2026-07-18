import { z } from "zod";

export const noteStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "deferred",
]);

export const setNoteStatusSchema = z.object({
  status: noteStatusSchema,
});

export type NoteStatus = z.infer<typeof noteStatusSchema>;
export type SetNoteStatus = z.infer<typeof setNoteStatusSchema>;
