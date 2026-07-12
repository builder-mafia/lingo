import { z } from "zod";

export const noteSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
});

export type Note = z.infer<typeof noteSchema>;
