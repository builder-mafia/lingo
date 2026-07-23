import { describe, expect, test } from "bun:test";

import {
  makeLocalWebApp,
  type LocalWebAppApi,
} from "../../src/server/local-web-app";

const noteId = "7504fbaf-e16c-42c0-91a8-ff9e2f5e4eaa";
const questionId = "9237cfd4-2883-48dc-a7ac-a23ee3bc3efa";

const makeApi = () => {
  const calls: string[] = [];
  const api: LocalWebAppApi = {
    listWorkspace: () => Promise.resolve({ notes: [], prompts: [] }),
    setNoteStatus: (_noteId, status) =>
      Promise.resolve({ noteId, status }),
    trashNote: (targetNoteId) => {
      calls.push(`trash:${targetNoteId}`);
      return Promise.resolve({ noteId: targetNoteId, trashed: true });
    },
    findNoteOverview: () => Promise.resolve(undefined),
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
