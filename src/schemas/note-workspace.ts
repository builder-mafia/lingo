import { z } from "zod";

import { noteIdSchema, noteLabelSchema, noteTitleSchema } from "./note";
import { noteStatusSchema } from "./note-status";
import { courseIdSchema, courseTitleSchema } from "./course";

export const noteWorkspaceItemSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  content: z.string().nullable(),
  labels: z.array(noteLabelSchema),
  status: noteStatusSchema,
  openQuestionCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  courseContext: z
    .object({
      courseId: courseIdSchema,
      courseTitle: courseTitleSchema,
      position: z.number().int().positive(),
    })
    .nullable(),
});

export type NoteWorkspaceItem = z.infer<typeof noteWorkspaceItemSchema>;
