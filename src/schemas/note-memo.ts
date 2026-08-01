import { z } from "zod";

import { noteIdSchema } from "./note";

export const setNoteMemoSchema = z.object({
  content: z.string().max(100_000),
});

export const noteMemoSchema = z.object({
  id: z.string().uuid(),
  noteId: noteIdSchema,
  content: z.string().max(100_000).refine((content) => content.trim().length > 0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const noteMemoStateSchema = z.object({
  noteId: noteIdSchema,
  memo: noteMemoSchema.nullable(),
});

export type NoteMemo = z.infer<typeof noteMemoSchema>;
export type NoteMemoState = z.infer<typeof noteMemoStateSchema>;
export type SetNoteMemo = z.infer<typeof setNoteMemoSchema>;
