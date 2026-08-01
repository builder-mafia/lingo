import { z } from "zod";

import {
  noteIdSchema,
  noteLabelSchema,
  noteTitleSchema,
} from "./note";
import { noteStatusSchema } from "./note-status";

export const knowledgeMapNodeSchema = z.object({
  id: noteIdSchema,
  title: noteTitleSchema,
  labels: z.array(noteLabelSchema),
  status: noteStatusSchema,
  courseContext: z
    .object({
      courseId: z.string().uuid(),
      courseTitle: z.string().trim().min(1),
      position: z.number().int().positive(),
    })
    .nullable(),
});

export const knowledgeMapEdgeKindSchema = z.enum([
  "related",
  "course_sequence",
]);

export const knowledgeMapEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNoteId: noteIdSchema,
  targetNoteId: noteIdSchema,
  kind: knowledgeMapEdgeKindSchema,
});

export const knowledgeMapSchema = z.object({
  nodes: z.array(knowledgeMapNodeSchema),
  edges: z.array(knowledgeMapEdgeSchema),
});

export const addKnowledgeMapRelationSchema = z.object({
  noteId: noteIdSchema,
  targetNoteId: noteIdSchema,
});

export type KnowledgeMap = z.infer<typeof knowledgeMapSchema>;
export type KnowledgeMapNode = z.infer<typeof knowledgeMapNodeSchema>;
export type KnowledgeMapEdge = z.infer<typeof knowledgeMapEdgeSchema>;
