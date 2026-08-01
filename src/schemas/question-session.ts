import { z } from "zod";

import { multipleChoiceChoiceSchema } from "./multiple-choice";
import { noteIdSchema, noteLabelSchema, noteTitleSchema } from "./note";
import { noteStatusSchema } from "./note-status";
import { courseNoteContextSchema } from "./course-workspace";
import { noteMemoSchema } from "./note-memo";
import { noteSourceSchema } from "./note-source";

export const noteQuestionItemSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["subjective", "multiple_choice"]),
  question: z.string().trim().min(1),
  resolvedAt: z.string().datetime().nullable(),
  hasAnswer: z.boolean(),
  hasFeedback: z.boolean(),
});

export const noteOverviewSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  content: z.string().nullable(),
  sources: z.array(noteSourceSchema),
  memo: noteMemoSchema.nullable(),
  labels: z.array(noteLabelSchema),
  status: noteStatusSchema,
  questions: z.array(noteQuestionItemSchema),
  courseContext: courseNoteContextSchema.nullable(),
});

const questionSessionBaseSchema = z.object({
  questionId: z.string().uuid(),
  noteId: noteIdSchema,
  noteTitle: noteTitleSchema,
  content: z.string().nullable(),
  question: z.string().trim().min(1),
  nextQuestionId: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  courseContext: courseNoteContextSchema.nullable(),
});

export const subjectiveQuestionSessionSchema = questionSessionBaseSchema.extend({
  kind: z.literal("subjective"),
  answer: z.string().nullable(),
  feedback: z.string().nullable(),
});

export const multipleChoiceQuestionSessionSchema =
  questionSessionBaseSchema.extend({
    kind: z.literal("multiple_choice"),
    choices: z.array(multipleChoiceChoiceSchema).min(2),
    correctId: z.number().int().positive(),
    selectedId: z.number().int().positive().nullable(),
  });

export const questionSessionSchema = z.discriminatedUnion("kind", [
  subjectiveQuestionSessionSchema,
  multipleChoiceQuestionSessionSchema,
]);

export type NoteOverview = z.infer<typeof noteOverviewSchema>;
export type QuestionSession = z.infer<typeof questionSessionSchema>;
export type SubjectiveQuestionSession = z.infer<
  typeof subjectiveQuestionSessionSchema
>;
export type MultipleChoiceQuestionSession = z.infer<
  typeof multipleChoiceQuestionSessionSchema
>;
