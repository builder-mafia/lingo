import { z } from "zod";

import {
  chapterObjectiveSchema,
  courseGoalSchema,
  courseIdSchema,
  courseTitleSchema,
} from "./course";
import { noteIdSchema, noteLabelSchema, noteTitleSchema } from "./note";
import { noteStatusSchema } from "./note-status";

export const courseWorkspaceItemSchema = z.object({
  id: courseIdSchema,
  title: courseTitleSchema,
  goal: courseGoalSchema,
  status: noteStatusSchema,
  chapterCount: z.number().int().nonnegative(),
  completedChapterCount: z.number().int().nonnegative(),
  openQuestionCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  currentChapter: z
    .object({
      position: z.number().int().positive(),
      title: noteTitleSchema,
    })
    .nullable(),
});

export const courseChapterOverviewSchema = z.object({
  position: z.number().int().positive(),
  noteId: noteIdSchema,
  title: noteTitleSchema,
  objective: chapterObjectiveSchema,
  labels: z.array(noteLabelSchema),
  status: noteStatusSchema,
  openQuestionCount: z.number().int().nonnegative(),
  trashed: z.boolean(),
});

export const courseOverviewSchema = z.object({
  id: courseIdSchema,
  title: courseTitleSchema,
  goal: courseGoalSchema,
  status: noteStatusSchema,
  createdAt: z.string().datetime(),
  chapters: z.array(courseChapterOverviewSchema),
});

export const courseNoteContextSchema = z.object({
  courseId: courseIdSchema,
  courseTitle: courseTitleSchema,
  position: z.number().int().positive(),
  nextChapter: z
    .object({
      noteId: noteIdSchema,
      title: noteTitleSchema,
      position: z.number().int().positive(),
    })
    .nullable(),
});

export type CourseWorkspaceItem = z.infer<typeof courseWorkspaceItemSchema>;
export type CourseOverview = z.infer<typeof courseOverviewSchema>;
export type CourseNoteContext = z.infer<typeof courseNoteContextSchema>;
