import { createBrowserRouter, type RouteObject } from "react-router";

import { AppShell } from "../layouts/app-shell/AppShell";
import { NotFoundPage } from "../pages/not-found/NotFoundPage";
import {
  loadNoteOverview,
  loadQuestionSession,
  loadWorkspace,
} from "../shared/api/workspace";

const RouteHydrationFallback = () => null;

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    Component: AppShell,
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
