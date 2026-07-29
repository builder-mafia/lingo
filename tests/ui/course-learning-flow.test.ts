import { describe, expect, test } from "bun:test";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("course learning flow", () => {
  test("keeps course context and the next chapter visible in note learning", async () => {
    const [overview, question] = await Promise.all([
      readSource("src/ui/pages/note-overview/NoteOverviewPage.tsx"),
      readSource("src/ui/pages/question-session/QuestionSessionPage.tsx"),
    ]);

    expect(overview).toContain("courseContext");
    expect(overview).toContain("코스로 돌아가기");
    expect(overview).toContain("다음 장");
    expect(question).toContain("courseContext");
    expect(question).toContain("routePaths.course");
  });

  test("states every chapter status in visible text", async () => {
    const overview = await readSource(
      "src/ui/pages/course-overview/CourseOverviewPage.tsx",
    );

    expect(overview).toContain("chapterStatusLabels");
    expect(overview).toContain("현재");
    expect(overview).toContain("휴지통에서 복원");
  });
});
