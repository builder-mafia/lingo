import { describe, expect, test } from "bun:test";

import {
  makeLocalWebApp,
  type LocalWebAppApi,
} from "../../src/server/local-web-app";

const noteId = "7504fbaf-e16c-42c0-91a8-ff9e2f5e4eaa";
const questionId = "9237cfd4-2883-48dc-a7ac-a23ee3bc3efa";
const courseId = "11a848e1-d725-4820-aac6-5bb4661f08ef";

const makeApi = () => {
  const calls: string[] = [];
  const api: LocalWebAppApi = {
    listCourses: () =>
      Promise.resolve([
        {
          id: courseId,
          title: "Effect 핵심",
          goal: "Effect의 실행 모델을 익힌다.",
          status: "not_started",
          chapterCount: 2,
          completedChapterCount: 0,
          openQuestionCount: 3,
          createdAt: "2026-07-29T00:00:00.000Z",
          currentChapter: { position: 1, title: "동기 Effect" },
        },
      ]),
    findCourseOverview: () => Promise.resolve(undefined),
    setCourseStatus: (targetCourseId, status) => {
      calls.push(`course-status:${targetCourseId}:${status}`);
      return Promise.resolve({ courseId: targetCourseId, status });
    },
    listWorkspace: () => Promise.resolve({ notes: [] }),
    listTrashedNotes: () =>
      Promise.resolve([
        {
          id: noteId,
          title: "삭제한 노트",
          content: null,
          deletedAt: "2026-07-28T00:00:00.000Z",
        },
      ]),
    setNoteStatus: (_noteId, status) =>
      Promise.resolve({ noteId, status }),
    trashNote: (targetNoteId) => {
      calls.push(`trash:${targetNoteId}`);
      return Promise.resolve({ noteId: targetNoteId, trashed: true });
    },
    restoreNote: (targetNoteId) => {
      calls.push(`restore:${targetNoteId}`);
      return Promise.resolve({ noteId: targetNoteId, restored: true });
    },
    permanentlyDeleteNote: (targetNoteId) => {
      calls.push(`delete:${targetNoteId}`);
      return Promise.resolve({ noteId: targetNoteId, deleted: true });
    },
    findNoteOverview: () => Promise.resolve(undefined),
    setNoteMemo: (targetNoteId, content) => {
      calls.push(`memo:${targetNoteId}:${content}`);
      return Promise.resolve({ noteId: targetNoteId, memo: null });
    },
    findQuestionSession: () => Promise.resolve(undefined),
    setSubjectiveAnswer: (targetQuestionId, content) =>
      Promise.resolve({ questionId: targetQuestionId, content }),
    setMultipleChoiceAnswer: (targetQuestionId, selectedId) => {
      calls.push(`choice:${targetQuestionId}:${selectedId}`);
      return Promise.resolve({
        questionId: targetQuestionId,
        selectedId,
        correct: selectedId === 2,
      });
    },
    resolveQuestion: (targetQuestionId) =>
      Promise.resolve({ questionId: targetQuestionId, resolved: true }),
    reopenQuestion: (targetQuestionId) =>
      Promise.resolve({ questionId: targetQuestionId, resolved: false }),
  };

  return { api, calls };
};

const webAssets = {
  hasIndex: () => Promise.resolve(false),
  read: () => Promise.resolve(undefined),
};

describe("local web app note and choice actions", () => {
  test("lists courses and updates course status", async () => {
    const { api, calls } = makeApi();
    const app = makeLocalWebApp({ api, webAssets });

    const listResponse = await app.request("/api/courses");
    const statusResponse = await app.request(`/api/courses/${courseId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });

    expect(await listResponse.json()).toEqual({
      ok: true,
      data: [expect.objectContaining({ id: courseId, chapterCount: 2 })],
    });
    expect(await statusResponse.json()).toEqual({
      ok: true,
      data: { courseId, status: "in_progress" },
    });
    expect(calls).toEqual([`course-status:${courseId}:in_progress`]);
  });

  test("moves a note to trash through DELETE /api/notes/:noteId", async () => {
    const { api, calls } = makeApi();
    const app = makeLocalWebApp({ api, webAssets });

    const response = await app.request(`/api/notes/${noteId}`, {
      method: "DELETE",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { noteId, trashed: true },
    });
    expect(calls).toEqual([`trash:${noteId}`]);
  });

  test("lists, restores, and permanently deletes trashed notes", async () => {
    const { api, calls } = makeApi();
    const app = makeLocalWebApp({ api, webAssets });

    const listResponse = await app.request("/api/trash");
    const restoreResponse = await app.request(
      `/api/trash/${noteId}/restore`,
      { method: "PATCH" },
    );
    const deleteResponse = await app.request(`/api/trash/${noteId}`, {
      method: "DELETE",
    });

    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual({
      ok: true,
      data: [expect.objectContaining({ id: noteId, title: "삭제한 노트" })],
    });
    expect(await restoreResponse.json()).toEqual({
      ok: true,
      data: { noteId, restored: true },
    });
    expect(await deleteResponse.json()).toEqual({
      ok: true,
      data: { noteId, deleted: true },
    });
    expect(calls).toEqual([`restore:${noteId}`, `delete:${noteId}`]);
  });

  test("stores a multiple-choice selection through the local API", async () => {
    const { api, calls } = makeApi();
    const app = makeLocalWebApp({ api, webAssets });

    const response = await app.request(`/api/questions/${questionId}/choice`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedId: 2 }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { questionId, selectedId: 2, correct: true },
    });
    expect(calls).toEqual([`choice:${questionId}:2`]);
  });

  test("stores note memo text through PUT /api/notes/:noteId/memo", async () => {
    const { api, calls } = makeApi();
    const app = makeLocalWebApp({ api, webAssets });

    const response = await app.request(`/api/notes/${noteId}/memo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "비동기 경계를 다시 실험한다." }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      data: { noteId, memo: null },
    });
    expect(calls).toEqual([`memo:${noteId}:비동기 경계를 다시 실험한다.`]);
  });

  test("rejects an invalid multiple-choice selection", async () => {
    const { api, calls } = makeApi();
    const app = makeLocalWebApp({ api, webAssets });

    const response = await app.request(`/api/questions/${questionId}/choice`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedId: 0 }),
    });

    expect(response.status).toBe(400);
    expect(calls).toEqual([]);
  });
});
