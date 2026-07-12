import { z } from "zod";

export const noteIdSchema = z.string().uuid();

export const noteSchema = z.object({
  id: noteIdSchema,
  createdAt: z.string().datetime(),
});

export type Note = z.infer<typeof noteSchema>;
