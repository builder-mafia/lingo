import { describe, expect, test } from "bun:test";

import { routePaths } from "../../src/ui/app/route-paths";

describe("UI route paths", () => {
  test("builds note workflow paths from a note id", () => {
    expect(routePaths.note("effect basics")).toBe("/notes/effect%20basics");
    expect(routePaths.questionSession("effect basics")).toBe(
      "/notes/effect%20basics/session",
    );
    expect(routePaths.sessionReflection("effect basics")).toBe(
      "/notes/effect%20basics/result",
    );
  });
});
