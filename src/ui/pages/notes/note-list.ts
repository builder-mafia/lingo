import type { NoteWorkspaceItem } from "../../../schemas/note-workspace";

export type NoteListFilters = {
  readonly openQuestionsOnly: boolean;
  readonly query: string;
  readonly sort: string;
  readonly status: string;
};

export const filterAndSortNotes = (
  notes: readonly NoteWorkspaceItem[],
  filters: NoteListFilters,
) => {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("ko-KR");

  return notes
    .filter(
      (note) =>
        filters.status === "all" || note.status === filters.status,
    )
    .filter(
      (note) => !filters.openQuestionsOnly || note.openQuestionCount > 0,
    )
    .filter((note) =>
      !normalizedQuery
        ? true
        : `${note.title} ${note.content ?? ""}`
            .toLocaleLowerCase("ko-KR")
            .includes(normalizedQuery),
    )
    .toSorted((left, right) => {
      if (filters.sort === "oldest") {
        return left.updatedAt.localeCompare(right.updatedAt);
      }
      if (filters.sort === "title") {
        return left.title.localeCompare(right.title, "ko-KR");
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
};
