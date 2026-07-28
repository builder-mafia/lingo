import { describe, expect, test } from "bun:test";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("note actions and multiple-choice UI", () => {
  test("moves a note to trash from a Base UI context menu", async () => {
    const [row, api] = await Promise.all([
      readSource("src/ui/pages/notes/NoteRow.tsx"),
      readSource("src/ui/shared/api/workspace.ts"),
    ]);

    expect(row).toContain('from "@base-ui/react/context-menu"');
    expect(row).toContain('from "lucide-react"');
    expect(row).toContain("Trash2");
    expect(row).toContain("제거하기");
    expect(api).toContain('method: "DELETE"');
  });

  test("renders a dedicated multiple-choice question flow", async () => {
    const [page, multipleChoice] = await Promise.all([
      readSource("src/ui/pages/question-session/QuestionSessionPage.tsx"),
      readSource(
        "src/ui/pages/question-session/MultipleChoiceQuestion.tsx",
      ),
    ]);

    expect(page).toContain('session.kind === "multiple_choice"');
    expect(multipleChoice).toContain("saveMultipleChoiceAnswer");
    expect(multipleChoice).toContain("선택 확인");
    expect(multipleChoice).toContain("해설");
  });

  test("offers the next question after an answer with a quieter title", async () => {
    const [subjective, multipleChoice, navigation, styles] = await Promise.all([
      readSource("src/ui/pages/question-session/SubjectiveQuestion.tsx"),
      readSource("src/ui/pages/question-session/MultipleChoiceQuestion.tsx"),
      readSource("src/ui/pages/question-session/NextQuestionLink.tsx"),
      readSource("src/ui/pages/question-session/QuestionSessionPage.module.css"),
    ]);

    expect(subjective).toContain("NextQuestionLink");
    expect(multipleChoice).toContain("NextQuestionLink");
    expect(navigation).toContain("다음 질문");
    expect(navigation).toContain("노트로 돌아가기");
    expect(navigation).toContain("ArrowRight");
    expect(styles).toContain("font-size: clamp(22px, 2.2vw, 30px);");
    expect(styles).toContain("max-width: 36ch;");
  });

  test("uses direct question section labels", async () => {
    const overview = await readSource(
      "src/ui/pages/note-overview/NoteOverviewPage.tsx",
    );

    expect(overview).toContain('<h2 id="open-heading">질문</h2>');
    expect(overview).toContain('<h2 id="resolved-heading">답변 완료</h2>');
    expect(overview).not.toContain("이어갈 질문");
    expect(overview).not.toContain("정리한 질문");
  });
});
