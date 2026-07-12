import { z } from "zod";

export const createSubjectiveProblemSchema = z.object({
  question: z.string().trim().min(1),
  referenceAnswer: z.string().trim().min(1),
});

export type CreateSubjectiveProblem = z.infer<typeof createSubjectiveProblemSchema>;
