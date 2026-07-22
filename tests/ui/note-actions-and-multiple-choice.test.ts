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
});
