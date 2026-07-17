import { z } from "zod";

export const noteIdSchema = z.string().uuid();
export const noteTitleSchema = z.string().trim().min(1);
export const noteLabelSchema = z.string().trim().min(1);

export const createNoteSchema = z.object({
  title: noteTitleSchema,
  labels: z
    .array(noteLabelSchema)
    .default([])
    .transform((labels) => [...new Set(labels)]),
});

export const noteSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  labels: z.array(noteLabelSchema),
  createdAt: z.string().datetime(),
});

export type CreateNote = z.infer<typeof createNoteSchema>;
export type Note = z.infer<typeof noteSchema>;
