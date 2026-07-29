import { describe, expect, test } from "bun:test";

import { routePaths } from "../../src/ui/app/route-paths";

describe("UI route paths", () => {
  test("builds note workflow paths from a note id", () => {
    expect(routePaths.note("effect basics")).toBe("/notes/effect%20basics");
    expect(routePaths.trash).toBe("/trash");
    expect(routePaths.question("effect basics", "typed error")).toBe(
      "/notes/effect%20basics/questions/typed%20error",
    );
  });

  test("builds course workspace and overview paths", () => {
    expect(routePaths.courses).toBe("/courses");
    expect(routePaths.course("effect basics")).toBe(
      "/courses/effect%20basics",
    );
  });
});
