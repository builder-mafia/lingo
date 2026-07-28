import { z } from "zod";

import { noteIdSchema, noteLabelSchema, noteTitleSchema } from "./note";

export const trashedNoteSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  content: z.string().nullable(),
  labels: z.array(noteLabelSchema),
  deletedAt: z.string().datetime(),
});

export type TrashedNote = z.infer<typeof trashedNoteSchema>;
