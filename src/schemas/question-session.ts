import { z } from "zod";

import { noteIdSchema, noteLabelSchema, noteTitleSchema } from "./note";
import { noteStatusSchema } from "./note-status";

export const noteQuestionItemSchema = z.object({
  id: z.string().uuid(),
  question: z.string().trim().min(1),
  resolvedAt: z.string().datetime().nullable(),
  hasAnswer: z.boolean(),
  hasFeedback: z.boolean(),
});

export const noteOverviewSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  summary: z.string().nullable(),
  labels: z.array(noteLabelSchema),
  status: noteStatusSchema,
  questions: z.array(noteQuestionItemSchema),
});

export const questionSessionSchema = z.object({
  questionId: z.string().uuid(),
  noteId: noteIdSchema,
  noteTitle: noteTitleSchema,
  summary: z.string().nullable(),
  question: z.string().trim().min(1),
  answer: z.string().nullable(),
  feedback: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
});

export type NoteOverview = z.infer<typeof noteOverviewSchema>;
export type QuestionSession = z.infer<typeof questionSessionSchema>;
