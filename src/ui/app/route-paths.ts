export const routePaths = {
  notes: "/",
  trash: "/trash",
  note: (noteId: string) => `/notes/${encodeURIComponent(noteId)}`,
  question: (noteId: string, questionId: string) =>
    `/notes/${encodeURIComponent(noteId)}/questions/${encodeURIComponent(questionId)}`,
} as const;
