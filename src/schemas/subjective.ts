import { z } from "zod";

export const createSubjectiveQuestionSchema = z.object({
  question: z.string().trim().min(1),
  referenceAnswer: z.string().trim().min(1),
});

export type CreateSubjectiveQuestion = z.infer<typeof createSubjectiveQuestionSchema>;
