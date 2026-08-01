import { z } from "zod";

import { noteIdSchema } from "./note";

export const noteSourceIdSchema = z.string().uuid();

const webUrlSchema = z
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Source URL must use HTTP or HTTPS.");

export const createNoteSourceSchema = z.object({
  title: z.string().trim().min(1).max(240),
  url: webUrlSchema,
  description: z.string().trim().min(1).max(600).optional(),
});

export const noteSourceSchema = z.object({
  id: noteSourceIdSchema,
  noteId: noteIdSchema,
  title: z.string().trim().min(1).max(240),
  url: webUrlSchema,
  description: z.string().trim().min(1).max(600).nullable(),
  position: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

export const noteSourceListSchema = z.object({
  noteId: noteIdSchema,
  sources: z.array(noteSourceSchema),
});

export type CreateNoteSource = z.infer<typeof createNoteSourceSchema>;
export type NoteSource = z.infer<typeof noteSourceSchema>;
export type NoteSourceList = z.infer<typeof noteSourceListSchema>;
