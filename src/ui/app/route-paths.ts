export const routePaths = {
  notes: "/",
  note: (noteId: string) => `/notes/${encodeURIComponent(noteId)}`,
  question: (noteId: string, questionId: string) =>
    `/notes/${encodeURIComponent(noteId)}/questions/${encodeURIComponent(questionId)}`,
} as const;
