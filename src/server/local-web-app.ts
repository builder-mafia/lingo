import { Hono } from "hono";

import { setMultipleChoiceAnswerSchema } from "../schemas/multiple-choice";
import { noteIdSchema } from "../schemas/note";
import { setNoteStatusSchema, type NoteStatus } from "../schemas/note-status";
import type { NoteWorkspaceItem } from "../schemas/note-workspace";
import type { NoteOverview, QuestionSession } from "../schemas/question-session";
import { setSubjectiveAnswerSchema } from "../schemas/subjective-answer";
import type { TrashedNote } from "../schemas/trashed-note";
import { courseIdSchema } from "../schemas/course";
import {
  setNoteMemoSchema,
  type NoteMemoState,
} from "../schemas/note-memo";
import type {
  CourseOverview,
  CourseWorkspaceItem,
} from "../schemas/course-workspace";
import {
  addKnowledgeMapRelationSchema,
  type KnowledgeMap,
} from "../schemas/knowledge-map";
import {
  noteRelationIdSchema,
  type NoteRelation,
} from "../schemas/note-relation";
import type { WebAssets } from "./web-assets";

export type LocalWebAppApi = {
  readonly listCourses: () => Promise<readonly CourseWorkspaceItem[]>;
  readonly findCourseOverview: (
    courseId: string,
  ) => Promise<CourseOverview | undefined>;
  readonly setCourseStatus: (
    courseId: string,
    status: NoteStatus,
  ) => Promise<{ readonly courseId: string; readonly status: NoteStatus }>;
  readonly listWorkspace: () => Promise<{
    readonly notes: readonly NoteWorkspaceItem[];
  }>;
  readonly setNoteStatus: (
    noteId: string,
    status: NoteStatus,
  ) => Promise<{ readonly noteId: string; readonly status: NoteStatus }>;
  readonly trashNote: (
    noteId: string,
  ) => Promise<{ readonly noteId: string; readonly trashed: true }>;
  readonly listTrashedNotes: () => Promise<readonly TrashedNote[]>;
  readonly restoreNote: (
    noteId: string,
  ) => Promise<{ readonly noteId: string; readonly restored: true }>;
  readonly permanentlyDeleteNote: (
    noteId: string,
  ) => Promise<{ readonly noteId: string; readonly deleted: true }>;
  readonly findNoteOverview: (noteId: string) => Promise<NoteOverview | undefined>;
  readonly setNoteMemo: (
    noteId: string,
    content: string,
  ) => Promise<NoteMemoState>;
  readonly readKnowledgeMap: () => Promise<KnowledgeMap>;
  readonly addNoteRelation: (
    noteId: string,
    targetNoteId: string,
  ) => Promise<NoteRelation>;
  readonly removeNoteRelation: (
    relationId: string,
  ) => Promise<{ readonly relationId: string; readonly removed: true }>;
  readonly findQuestionSession: (
    questionId: string,
  ) => Promise<QuestionSession | undefined>;
  readonly setSubjectiveAnswer: (
    questionId: string,
    content: string,
  ) => Promise<{ readonly questionId: string; readonly content: string }>;
  readonly setMultipleChoiceAnswer: (
    questionId: string,
    selectedId: number,
  ) => Promise<{
    readonly questionId: string;
    readonly selectedId: number;
    readonly correct: boolean;
  }>;
  readonly resolveQuestion: (
    questionId: string,
  ) => Promise<{ readonly questionId: string; readonly resolved: true }>;
  readonly reopenQuestion: (
    questionId: string,
  ) => Promise<{ readonly questionId: string; readonly resolved: false }>;
};

type LocalWebAppConfig = {
  readonly webAssets: WebAssets;
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

const assetResponse = async (
  webAssets: WebAssets,
  pathname: string,
  cacheControl: string,
) => {
  const asset = await webAssets.read(pathname);
  if (asset === undefined) return undefined;

  const headers = new Headers({ "Cache-Control": cacheControl });
  if (asset.type !== "") headers.set("Content-Type", asset.type);
  return new Response(asset, { headers });
};

export const makeLocalWebApp = ({ webAssets, api }: LocalWebAppConfig) => {
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

  app.get("/api/knowledge-map", async (context) => {
    try {
      return context.json({ ok: true, data: await api.readKnowledgeMap() });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.post("/api/note-relations", async (context) => {
    const input = addKnowledgeMapRelationSchema.safeParse(
      await context.req.json().catch(() => undefined),
    );
    if (!input.success) return context.json(invalidInputResponse, 400);

    try {
      return context.json({
        ok: true,
        data: await api.addNoteRelation(
          input.data.noteId,
          input.data.targetNoteId,
        ),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.delete("/api/note-relations/:relationId", async (context) => {
    const relationId = noteRelationIdSchema.safeParse(
      context.req.param("relationId"),
    );
    if (!relationId.success) return context.json(invalidInputResponse, 400);

    try {
      return context.json({
        ok: true,
        data: await api.removeNoteRelation(relationId.data),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.get("/api/courses", async (context) => {
    try {
      return context.json({ ok: true, data: await api.listCourses() });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.get("/api/courses/:courseId", async (context) => {
    const courseId = courseIdSchema.safeParse(context.req.param("courseId"));
    if (!courseId.success) return context.json(invalidInputResponse, 400);

    try {
      const course = await api.findCourseOverview(courseId.data);
      return course
        ? context.json({ ok: true, data: course })
        : context.json(notFoundResponse, 404);
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.patch("/api/courses/:courseId/status", async (context) => {
    const courseId = courseIdSchema.safeParse(context.req.param("courseId"));
    const input = setNoteStatusSchema.safeParse(
      await context.req.json().catch(() => undefined),
    );
    if (!courseId.success || !input.success) {
      return context.json(invalidInputResponse, 400);
    }

    try {
      return context.json({
        ok: true,
        data: await api.setCourseStatus(courseId.data, input.data.status),
      });
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

  app.delete("/api/notes/:noteId", async (context) => {
    const noteId = noteIdSchema.safeParse(context.req.param("noteId"));
    if (!noteId.success) return context.json(invalidInputResponse, 400);

    try {
      return context.json({
        ok: true,
        data: await api.trashNote(noteId.data),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.get("/api/trash", async (context) => {
    try {
      return context.json({ ok: true, data: await api.listTrashedNotes() });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.patch("/api/trash/:noteId/restore", async (context) => {
    const noteId = noteIdSchema.safeParse(context.req.param("noteId"));
    if (!noteId.success) return context.json(invalidInputResponse, 400);

    try {
      return context.json({
        ok: true,
        data: await api.restoreNote(noteId.data),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.delete("/api/trash/:noteId", async (context) => {
    const noteId = noteIdSchema.safeParse(context.req.param("noteId"));
    if (!noteId.success) return context.json(invalidInputResponse, 400);

    try {
      return context.json({
        ok: true,
        data: await api.permanentlyDeleteNote(noteId.data),
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

  app.put("/api/notes/:noteId/memo", async (context) => {
    const noteId = noteIdSchema.safeParse(context.req.param("noteId"));
    const input = setNoteMemoSchema.safeParse(
      await context.req.json().catch(() => undefined),
    );
    if (!noteId.success || !input.success) {
      return context.json(invalidInputResponse, 400);
    }

    try {
      return context.json({
        ok: true,
        data: await api.setNoteMemo(noteId.data, input.data.content),
      });
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

  app.put("/api/questions/:questionId/choice", async (context) => {
    const questionId = noteIdSchema.safeParse(context.req.param("questionId"));
    const input = setMultipleChoiceAnswerSchema.safeParse(
      await context.req.json().catch(() => undefined),
    );
    if (!questionId.success || !input.success) {
      return context.json(invalidInputResponse, 400);
    }

    try {
      return context.json({
        ok: true,
        data: await api.setMultipleChoiceAnswer(
          questionId.data,
          input.data.selectedId,
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
        data: await api.resolveQuestion(questionId.data),
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
        data: await api.reopenQuestion(questionId.data),
      });
    } catch {
      return context.json(requestFailedResponse, 500);
    }
  });

  app.get("/assets/*", async (context) => {
    const response = await assetResponse(
      webAssets,
      new URL(context.req.url).pathname,
      "public, max-age=31536000, immutable",
    );
    return response ?? context.json(notFoundResponse, 404);
  });
  app.all("/assets/*", (context) => context.json(notFoundResponse, 404));
  app.all("/api/*", (context) => context.json(notFoundResponse, 404));

  app.get("*", async (context) => {
    const response = await assetResponse(
      webAssets,
      "/index.html",
      "no-cache",
    );
    return response ?? context.json(notFoundResponse, 404);
  });

  app.notFound((context) => context.json(notFoundResponse, 404));

  return app;
};
