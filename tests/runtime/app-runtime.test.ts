import { expect, test } from "bun:test";

import { validateMultipleChoiceProblem } from "../../src/cli/commands/validate-multiple-choice";
import { AppRuntime } from "../../src/runtime";

test("AppRuntime provides shared layers for a command without per-command injection", async () => {
  const result = await AppRuntime.runPromise(
    validateMultipleChoiceProblem({
      data: JSON.stringify({
        question: "공유 런타임이 Layer를 제공하나요?",
        choices: [
          { order: 1, option: "예", explanation: "정답입니다." },
          { order: 2, option: "아니요", explanation: "오답입니다." },
        ],
        correctId: 1,
      }),
    }),
  );

  expect(result.correctId).toBe(1);
});
