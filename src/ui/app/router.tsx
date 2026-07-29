import { createBrowserRouter, type RouteObject } from "react-router";

import { AppShell } from "../layouts/app-shell/AppShell";
import { AppErrorPage } from "../pages/app-error/AppErrorPage";
import { NotFoundPage } from "../pages/not-found/NotFoundPage";
import {
  loadNoteOverview,
  loadCourseOverview,
  loadCourses,
  loadQuestionSession,
  loadTrash,
  loadWorkspace,
} from "../shared/api/workspace";

const RouteHydrationFallback = () => null;

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    Component: AppShell,
    ErrorBoundary: AppErrorPage,
    children: [
      {
        index: true,
        loader: loadWorkspace,
        HydrateFallback: RouteHydrationFallback,
        lazy: async () => {
          const { NotesPage } = await import(
            "../pages/notes/NotesPage"
          );
          return { Component: NotesPage };
        },
      },
      {
        path: "courses",
        loader: loadCourses,
        HydrateFallback: RouteHydrationFallback,
        lazy: async () => {
          const { CoursesPage } = await import("../pages/courses/CoursesPage");
          return { Component: CoursesPage };
        },
      },
      {
        path: "courses/:courseId",
        loader: ({ params }) => loadCourseOverview(params.courseId ?? ""),
        HydrateFallback: RouteHydrationFallback,
        lazy: async () => {
          const { CourseOverviewPage } = await import(
            "../pages/course-overview/CourseOverviewPage"
          );
          return { Component: CourseOverviewPage };
        },
      },
      {
        path: "trash",
        loader: loadTrash,
        HydrateFallback: RouteHydrationFallback,
        lazy: async () => {
          const { TrashPage } = await import("../pages/trash/TrashPage");
          return { Component: TrashPage };
        },
      },
      {
        path: "notes/:noteId",
        loader: ({ params }) => loadNoteOverview(params.noteId ?? ""),
        HydrateFallback: RouteHydrationFallback,
        lazy: async () => {
          const { NoteOverviewPage } = await import(
            "../pages/note-overview/NoteOverviewPage"
          );
          return { Component: NoteOverviewPage };
        },
      },
      {
        path: "notes/:noteId/questions/:questionId",
        loader: ({ params }) => loadQuestionSession(params.questionId ?? ""),
        HydrateFallback: RouteHydrationFallback,
        lazy: async () => {
          const { QuestionSessionPage } = await import(
            "../pages/question-session/QuestionSessionPage"
          );
          return { Component: QuestionSessionPage };
        },
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
