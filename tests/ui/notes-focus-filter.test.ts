import { describe, expect, test } from "bun:test";

import type { NoteWorkspaceItem } from "../../src/schemas/note-workspace";
import { filterAndSortNotes } from "../../src/ui/pages/notes/note-list";

const makeNote = (
  id: string,
  title: string,
  openQuestionCount: number,
  updatedAt: string,
  labels: readonly string[] = [],
): NoteWorkspaceItem => ({
  id,
  title,
  content: null,
  labels: [...labels],
  status: "not_started",
  openQuestionCount,
  updatedAt,
  courseContext: null,
});

describe("notes workspace focus filter", () => {
  test("shows only notes with open questions when requested", () => {
    const notes = [
      makeNote(
        "38bc4ee1-125b-4f3c-8572-02fde06b6296",
        "완료한 노트",
        0,
        "2026-07-30T00:00:00.000Z",
      ),
      makeNote(
        "92a2dfeb-aa86-4e80-974c-47e1a6871701",
        "질문이 있는 노트",
        2,
        "2026-08-01T00:00:00.000Z",
      ),
    ];

    expect(
      filterAndSortNotes(notes, {
        openQuestionsOnly: true,
        query: "",
        sort: "recent",
        status: "all",
        label: "all",
      }).map((note) => note.title),
    ).toEqual(["질문이 있는 노트"]);
  });

  test("composes label filtering with status, search, and question filters", () => {
    const matching = {
      ...makeNote(
        "8b4af663-b640-40c2-9d59-68523b8861dd",
        "Effect interruption",
        1,
        "2026-08-01T00:00:00.000Z",
        ["Effect", "Concurrency"],
      ),
      status: "in_progress" as const,
    };
    const notes = [
      matching,
      {
        ...makeNote(
          "ad0df4fc-986c-4228-adfa-69806dc7789d",
          "Effect basics",
          0,
          "2026-07-31T00:00:00.000Z",
          ["Effect"],
        ),
        status: "in_progress" as const,
      },
      {
        ...makeNote(
          "f725ed54-bbf2-4a7a-a615-266120e84a10",
          "Effect interruption in React",
          1,
          "2026-07-30T00:00:00.000Z",
          ["Frontend"],
        ),
        status: "in_progress" as const,
      },
    ];

    expect(
      filterAndSortNotes(notes, {
        openQuestionsOnly: true,
        query: "interruption",
        sort: "recent",
        status: "in_progress",
        label: "Effect",
      }),
    ).toEqual([matching]);
  });

  test("removes the persistent prompt panel in favor of a Base UI filter", async () => {
    const [page, styles] = await Promise.all([
      Bun.file(
        new URL("../../src/ui/pages/notes/NotesPage.tsx", import.meta.url),
      ).text(),
      Bun.file(
        new URL(
          "../../src/ui/pages/notes/NotesPage.module.css",
          import.meta.url,
        ),
      ).text(),
    ]);

    expect(page).toContain('from "@base-ui/react/toggle"');
    expect(page).toContain("질문 있는 노트");
    expect(page).not.toContain("지금 답할 수 있나요?");
    expect(styles).not.toContain(".promptPanel");
  });
});
