export const routePaths = {
  notes: "/",
  courses: "/courses",
  trash: "/trash",
  course: (courseId: string) => `/courses/${encodeURIComponent(courseId)}`,
  note: (noteId: string) => `/notes/${encodeURIComponent(noteId)}`,
  question: (noteId: string, questionId: string) =>
    `/notes/${encodeURIComponent(noteId)}/questions/${encodeURIComponent(questionId)}`,
} as const;
