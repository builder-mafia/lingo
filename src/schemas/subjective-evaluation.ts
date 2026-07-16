import { z } from "zod";

export const setSubjectiveEvaluationSchema = z.object({
  feedback: z.string().trim().min(1),
});

export type SetSubjectiveEvaluation = z.infer<typeof setSubjectiveEvaluationSchema>;
