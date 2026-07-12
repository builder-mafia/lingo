import { z } from "zod";

import { noteIdSchema } from "./note";

export { noteIdSchema } from "./note";

export const setNoteSummarySchema = z.object({
  content: z.string().trim().min(1),
});

export const noteSummarySchema = z.object({
  noteId: noteIdSchema,
  content: z.string().trim().min(1),
  updatedAt: z.string().datetime(),
});

export type SetNoteSummary = z.infer<typeof setNoteSummarySchema>;
export type NoteSummary = z.infer<typeof noteSummarySchema>;
