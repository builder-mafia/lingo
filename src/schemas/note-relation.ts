import { z } from "zod";

import {
  noteIdSchema,
  noteLabelSchema,
  noteTitleSchema,
} from "./note";

export const noteRelationIdSchema = z.string().uuid();

export const createNoteRelationSchema = z.object({
  targetNoteId: noteIdSchema,
});

export const noteRelationSchema = z
  .object({
    id: noteRelationIdSchema,
    noteAId: noteIdSchema,
    noteBId: noteIdSchema,
    createdAt: z.string().datetime(),
  })
  .refine(({ noteAId, noteBId }) => noteAId < noteBId);

export const relatedNoteSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  labels: z.array(noteLabelSchema),
});

export const noteRelationListItemSchema = z.object({
  relation: noteRelationSchema,
  note: relatedNoteSchema,
});

export const noteRelationListSchema = z.object({
  noteId: noteIdSchema,
  relations: z.array(noteRelationListItemSchema),
});

export type CreateNoteRelation = z.infer<typeof createNoteRelationSchema>;
export type NoteRelation = z.infer<typeof noteRelationSchema>;
export type NoteRelationList = z.infer<typeof noteRelationListSchema>;
