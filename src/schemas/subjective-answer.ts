import { z } from "zod";

export const setSubjectiveAnswerSchema = z.object({
  content: z.string().trim().min(1),
});

export type SetSubjectiveAnswer = z.infer<typeof setSubjectiveAnswerSchema>;
