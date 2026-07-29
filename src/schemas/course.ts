import { z } from "zod";

import { createNoteSchema, noteIdSchema, noteTitleSchema } from "./note";
import { noteStatusSchema } from "./note-status";

export const courseIdSchema = z.string().uuid();
export const courseTitleSchema = z.string().trim().min(1);
export const courseGoalSchema = z.string().trim().min(1);
export const chapterObjectiveSchema = z.string().trim().min(1);

export const createCourseChapterSchema = createNoteSchema.extend({
  objective: chapterObjectiveSchema,
});

export const createCourseSchema = z.object({
  title: courseTitleSchema,
  goal: courseGoalSchema,
  chapters: z.array(createCourseChapterSchema).min(2),
});

export const createdCourseChapterSchema = z.object({
  position: z.number().int().positive(),
  noteId: noteIdSchema,
  title: noteTitleSchema,
  objective: chapterObjectiveSchema,
  status: noteStatusSchema,
});

export const createdCourseSchema = z.object({
  courseId: courseIdSchema,
  title: courseTitleSchema,
  goal: courseGoalSchema,
  status: noteStatusSchema,
  createdAt: z.string().datetime(),
  chapterCount: z.number().int().nonnegative(),
  chapters: z.array(createdCourseChapterSchema),
});

export type CreateCourse = z.infer<typeof createCourseSchema>;
export type CreatedCourse = z.infer<typeof createdCourseSchema>;
