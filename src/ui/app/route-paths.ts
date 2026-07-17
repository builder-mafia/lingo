export const routePaths = {
  understandingMap: "/",
  note: (noteId: string) => `/notes/${encodeURIComponent(noteId)}`,
  questionSession: (noteId: string) =>
    `/notes/${encodeURIComponent(noteId)}/session`,
  sessionReflection: (noteId: string) =>
    `/notes/${encodeURIComponent(noteId)}/result`,
} as const;
