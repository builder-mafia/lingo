import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { join } from "node:path";

import { noteIdSchema } from "../schemas/note";
import { setNoteStatusSchema, type NoteStatus } from "../schemas/note-status";
import type {
  NoteWorkspaceItem,
  WorkspacePrompt,
} from "../schemas/note-workspace";
import type { NoteOverview, QuestionSession } from "../schemas/question-session";
import { setSubjectiveAnswerSchema } from "../schemas/subjective-answer";

export type LocalWebAppApi = {
  readonly listWorkspace: () => Promise<{
    readonly notes: readonly NoteWorkspaceItem[];
    readonly prompts: readonly WorkspacePrompt[];
  }>;
  readonly setNoteStatus: (
    noteId: string,
    status: NoteStatus,
  ) => Promise<{ readonly noteId: string; readonly status: NoteStatus }>;
  readonly findNoteOverview: (noteId: string) => Promise<NoteOverview | undefined>;
  readonly findQuestionSession: (
    questionId: string,
  ) => Promise<QuestionSession | undefined>;
  readonly setSubjectiveAnswer: (
    questionId: string,
    content: string,
  ) => Promise<{ readonly questionId: string; readonly content: string }>;
  readonly resolveSubjectiveQuestion: (
    questionId: string,
  ) => Promise<{ readonly questionId: string; readonly resolved: true }>;
  readonly reopenSubjectiveQuestion: (
    questionId: string,
  ) => Promise<{ readonly questionId: string; readonly resolved: false }>;
};

type LocalWebAppConfig = {
  readonly webRootPath: string;
  readonly api: LocalWebAppApi;
};

const notFoundResponse = {
  ok: false,
  error: {
    code: "NotFound",
    message: "Route not found.",
    details: [],
  },
} as const;

const invalidInputResponse = {
  ok: false,
  error: {
    code: "InvalidInput",
    message: "Request data is invalid.",
    details: [],
  },
} as const;

const requestFailedResponse = {
  ok: false,
  error: {
    code: "CliError",
    message: "Could not read or update local data.",
    details: [],
  },
} as const;

export const makeLocalWebApp = ({ webRootPath, api }: LocalWebAppConfig) => {
  const app = new Hono();

  app.get("/health", (context) =>
    context.json({ ok: true, data: { status: "ready" } }),
  );

  app.get("/api/workspace", async (context) => {
    try {
      return context.json({ ok: true, data: await api.listWorkspace() });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.patch("/api/notes/:noteId/status", async (context) => {
    const noteId = noteIdSchema.safeParse(context.req.param("noteId"));
    const input = setNoteStatusSchema.safeParse(
      await context.req.json().catch(() => undefined),
    );

    if (!noteId.success || !input.success) {
      return context.json(invalidInputResponse, 400);
    }

    try {
      return context.json({
        ok: true,
        data: await api.setNoteStatus(noteId.data, input.data.status),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.get("/api/notes/:noteId", async (context) => {
    const noteId = noteIdSchema.safeParse(context.req.param("noteId"));
    if (!noteId.success) return context.json(invalidInputResponse, 400);

    try {
      const note = await api.findNoteOverview(noteId.data);
      return note
        ? context.json({ ok: true, data: note })
        : context.json(notFoundResponse, 404);
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.get("/api/questions/:questionId", async (context) => {
    const questionId = noteIdSchema.safeParse(context.req.param("questionId"));
    if (!questionId.success) return context.json(invalidInputResponse, 400);

    try {
      const question = await api.findQuestionSession(questionId.data);
      return question
        ? context.json({ ok: true, data: question })
        : context.json(notFoundResponse, 404);
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.put("/api/questions/:questionId/answer", async (context) => {
    const questionId = noteIdSchema.safeParse(context.req.param("questionId"));
    const input = setSubjectiveAnswerSchema.safeParse(
      await context.req.json().catch(() => undefined),
    );
    if (!questionId.success || !input.success) {
      return context.json(invalidInputResponse, 400);
    }

    try {
      return context.json({
        ok: true,
        data: await api.setSubjectiveAnswer(
          questionId.data,
          input.data.content,
        ),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.patch("/api/questions/:questionId/resolution", async (context) => {
    const questionId = noteIdSchema.safeParse(context.req.param("questionId"));
    if (!questionId.success) return context.json(invalidInputResponse, 400);

    try {
      return context.json({
        ok: true,
        data: await api.resolveSubjectiveQuestion(questionId.data),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.delete("/api/questions/:questionId/resolution", async (context) => {
    const questionId = noteIdSchema.safeParse(context.req.param("questionId"));
    if (!questionId.success) return context.json(invalidInputResponse, 400);

    try {
      return context.json({
        ok: true,
        data: await api.reopenSubjectiveQuestion(questionId.data),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.get(
    "/assets/*",
    serveStatic({
      root: webRootPath,
      onFound: (_path, context) => {
        context.header("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
  app.all("/assets/*", (context) => context.json(notFoundResponse, 404));
  app.all("/api/*", (context) => context.json(notFoundResponse, 404));

  app.get(
    "*",
    serveStatic({
      root: "/",
      path: join(webRootPath, "index.html"),
      onFound: (_path, context) => {
        context.header("Cache-Control", "no-cache");
      },
    }),
  );

  app.notFound((context) => context.json(notFoundResponse, 404));

  return app;
};
