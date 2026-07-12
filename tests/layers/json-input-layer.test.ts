import { Effect } from "effect";
import { expect, test } from "bun:test";

import { JsonInput, JsonInputLive } from "../../src/layers/json-input";

test("JsonInputLive reads valid inline JSON through its Effect service interface", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const jsonInput = yield* JsonInput;
      return yield* jsonInput.read({ data: '{"noteId":"note_123"}' });
    }).pipe(Effect.provide(JsonInputLive)),
  );

  expect(result).toEqual({ noteId: "note_123" });
});
