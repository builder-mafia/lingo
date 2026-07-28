import { describe, expect, test } from "bun:test";

const readSource = (relativePath: string) =>
  Bun.file(new URL(`../../${relativePath}`, import.meta.url)).text();

describe("intentional UI motion", () => {
  test("reveals newly available learning results without staggering readable content", async () => {
    const [subjective, multipleChoice, styles] = await Promise.all([
      readSource("src/ui/pages/question-session/SubjectiveQuestion.tsx"),
      readSource("src/ui/pages/question-session/MultipleChoiceQuestion.tsx"),
      readSource("src/ui/pages/question-session/QuestionSessionPage.module.css"),
    ]);

    expect(subjective).toContain("styles.resultReveal");
    expect(multipleChoice).toContain("styles.resultReveal");
    expect(multipleChoice).toContain("styles.resultIconReveal");
    expect(styles).toContain("@starting-style");
    expect(styles).toContain("transform: translateY(4px)");
    expect(styles).toContain("150ms cubic-bezier(0.23, 1, 0.32, 1)");
    expect(styles).toContain("transition: opacity 80ms ease !important");
  });

  test("lets a trashed note leave the list before revalidation removes it", async () => {
    const [row, page, styles] = await Promise.all([
      readSource("src/ui/pages/notes/NoteRow.tsx"),
      readSource("src/ui/pages/notes/NotesPage.tsx"),
      readSource("src/ui/pages/notes/NotesPage.module.css"),
    ]);

    expect(row).toContain("data-removing={removing ? \"\" : undefined}");
    expect(page).toContain("const removalMotionDurationMs = 150");
    expect(page).toContain("const reducedRemovalMotionDurationMs = 80");
    expect(page).toContain(
      'window.matchMedia("(prefers-reduced-motion: reduce)").matches',
    );
    expect(page).toContain("await Promise.all([");
    expect(styles).toContain(".noteRow[data-removing]");
    expect(styles).toContain("transform: translateX(-8px)");
  });

  test("animates the theme icon wrapper and keeps the page palette immediate", async () => {
    const [toggle, styles, globalStyles] = await Promise.all([
      readSource("src/ui/features/theme-toggle/ThemeToggle.tsx"),
      readSource("src/ui/features/theme-toggle/ThemeToggle.module.css"),
      readSource("src/ui/styles/global.css"),
    ]);

    expect(toggle).toContain('<span className={styles.icon} aria-hidden="true">');
    expect(styles).toContain("transform: scale(0.97)");
    expect(styles).toContain("transform: scale(0.92)");
    expect(styles).toContain("transition: opacity 80ms ease !important");
    expect(globalStyles).not.toContain("transition: background-color");
  });
});
