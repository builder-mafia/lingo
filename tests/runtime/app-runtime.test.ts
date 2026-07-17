import { Effect } from "effect";
import { expect, test } from "bun:test";

import { JsonInput } from "../../src/layers/json-input";
import { AppRuntime } from "../../src/runtime";

test("AppRuntime provides shared layers for a command without per-command injection", async () => {
  const result = await AppRuntime.runPromise(
    Effect.gen(function* () {
      const jsonInput = yield* JsonInput;
      return yield* jsonInput.read({ data: '{"question":"공유 Layer"}' });
    }),
  );

  expect(result).toEqual({ question: "공유 Layer" });
});
