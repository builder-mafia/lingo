import { z } from "zod";

import { noteIdSchema, noteLabelSchema, noteTitleSchema } from "./note";
import { noteStatusSchema } from "./note-status";

export const noteWorkspaceItemSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  content: z.string().nullable(),
  labels: z.array(noteLabelSchema),
  status: noteStatusSchema,
  openQuestionCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export const workspacePromptSchema = z.object({
  questionId: z.string().uuid(),
  noteId: noteIdSchema,
  noteTitle: noteTitleSchema,
  question: z.string().trim().min(1),
  kind: z.enum(["unanswered", "feedback_ready", "multiple_choice"]),
  activityAt: z.string().datetime(),
});

export type NoteWorkspaceItem = z.infer<typeof noteWorkspaceItemSchema>;
export type WorkspacePrompt = z.infer<typeof workspacePromptSchema>;
