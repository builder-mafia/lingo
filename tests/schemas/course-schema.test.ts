import { describe, expect, test } from "bun:test";

import { createCourseSchema } from "../../src/schemas/course";

describe("course schema", () => {
  test("normalizes an ordered curriculum of chapter notes", () => {
    expect(
      createCourseSchema.parse({
        title: "  Effect 체계적으로 배우기  ",
        goal: "  Effect의 실행 모델과 핵심 연산자를 설명하고 적용한다.  ",
        chapters: [
          {
            title: "  동기 Effect  ",
            objective: "  동기 Effect의 생성과 실행을 구분한다.  ",
            labels: [" Effect ", "TypeScript", "Effect"],
          },
          {
            title: "비동기 Effect",
            objective: "비동기 작업을 안전하게 표현한다.",
          },
        ],
      }),
    ).toEqual({
      title: "Effect 체계적으로 배우기",
      goal: "Effect의 실행 모델과 핵심 연산자를 설명하고 적용한다.",
      chapters: [
        {
          title: "동기 Effect",
          objective: "동기 Effect의 생성과 실행을 구분한다.",
          labels: ["Effect", "TypeScript"],
        },
        {
          title: "비동기 Effect",
          objective: "비동기 작업을 안전하게 표현한다.",
          labels: [],
        },
      ],
    });
  });

  test("requires at least two chapters", () => {
    expect(
      createCourseSchema.safeParse({
        title: "Effect",
        goal: "Effect를 익힌다.",
        chapters: [{ title: "동기 Effect", objective: "동기 실행을 익힌다." }],
      }).success,
    ).toBe(false);
  });
});
