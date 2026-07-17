import { createBrowserRouter, type RouteObject } from "react-router";

import { AppShell } from "../layouts/app-shell/AppShell";
import { NotFoundPage } from "../pages/not-found/NotFoundPage";

const RouteHydrationFallback = () => null;

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    Component: AppShell,
    children: [
      {
        index: true,
        HydrateFallback: RouteHydrationFallback,
        lazy: async () => {
          const { UnderstandingMapPage } = await import(
            "../pages/understanding-map/UnderstandingMapPage"
          );
          return { Component: UnderstandingMapPage };
        },
      },
      { path: "*", Component: NotFoundPage },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
