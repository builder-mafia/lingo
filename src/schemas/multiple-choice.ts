import { z } from "zod";

export const multipleChoiceChoiceSchema = z.object({
  order: z.number().int().positive(),
  option: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
});

export const createMultipleChoiceQuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    choices: z.array(multipleChoiceChoiceSchema).min(2),
    correctId: z.number().int().positive(),
  })
  .superRefine(({ choices, correctId }, context) => {
    const orders = choices.map((choice) => choice.order);

    if (new Set(orders).size !== orders.length) {
      context.addIssue({
        code: "custom",
        path: ["choices"],
        message: "choices.order values must be unique.",
      });
    }

    if (!orders.includes(correctId)) {
      context.addIssue({
        code: "custom",
        path: ["correctId"],
        message: "correctId must match a choices.order value.",
      });
    }
  });

export const setMultipleChoiceAnswerSchema = z.object({
  selectedId: z.number().int().positive(),
});

export type CreateMultipleChoiceQuestion = z.infer<
  typeof createMultipleChoiceQuestionSchema
>;
export type SetMultipleChoiceAnswer = z.infer<
  typeof setMultipleChoiceAnswerSchema
>;
