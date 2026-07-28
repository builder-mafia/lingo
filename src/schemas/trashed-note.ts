import { z } from "zod";

import { noteIdSchema, noteTitleSchema } from "./note";

export const trashedNoteSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  content: z.string().nullable(),
  deletedAt: z.string().datetime(),
});

export type TrashedNote = z.infer<typeof trashedNoteSchema>;
