import { expect, test } from "bun:test";

import { createMultipleChoiceQuestionSchema } from "../../src/schemas/multiple-choice";

test("multiple-choice schema rejects a correctId that does not reference a choice order", () => {
  const result = createMultipleChoiceQuestionSchema.safeParse({
    question: "질문",
    choices: [
      { order: 1, option: "선택지 A", explanation: "정답입니다." },
      { order: 2, option: "선택지 B", explanation: "오답입니다." },
    ],
    correctId: 3,
  });

  expect(result.success).toBe(false);

  if (!result.success) {
    expect(result.error.issues[0]?.path).toEqual(["correctId"]);
  }
});
