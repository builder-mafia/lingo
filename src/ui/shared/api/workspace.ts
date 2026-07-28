import type { NoteStatus } from "../../../schemas/note-status";
import type {
  NoteWorkspaceItem,
  WorkspacePrompt,
} from "../../../schemas/note-workspace";
import type {
  NoteOverview,
  QuestionSession,
} from "../../../schemas/question-session";
import type { TrashedNote } from "../../../schemas/trashed-note";

type ApiSuccess<Data> = { readonly ok: true; readonly data: Data };

const readData = async <Data>(response: Response): Promise<Data> => {
  if (!response.ok) {
    throw new Error("Local data request failed.");
  }

  const body = (await response.json()) as ApiSuccess<Data>;
  return body.data;
};

export type WorkspaceData = {
  readonly notes: readonly NoteWorkspaceItem[];
  readonly prompts: readonly WorkspacePrompt[];
};

export const loadWorkspace = () =>
  fetch("/api/workspace", { headers: { Accept: "application/json" } }).then(
    readData<WorkspaceData>,
  );

export const updateNoteStatus = (noteId: string, status: NoteStatus) =>
  fetch(`/api/notes/${encodeURIComponent(noteId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ status }),
  }).then(readData<{ readonly noteId: string; readonly status: NoteStatus }>);

export const moveNoteToTrash = (noteId: string) =>
  fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  }).then(readData<{ readonly noteId: string; readonly trashed: true }>);

export type TrashData = readonly TrashedNote[];

export const loadTrash = () =>
  fetch("/api/trash", { headers: { Accept: "application/json" } }).then(
    readData<TrashData>,
  );

export const restoreNote = (noteId: string) =>
  fetch(`/api/trash/${encodeURIComponent(noteId)}/restore`, {
    method: "PATCH",
    headers: { Accept: "application/json" },
  }).then(readData<{ readonly noteId: string; readonly restored: true }>);

export const permanentlyDeleteNote = (noteId: string) =>
  fetch(`/api/trash/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  }).then(readData<{ readonly noteId: string; readonly deleted: true }>);

export const loadNoteOverview = (noteId: string) =>
  fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
    headers: { Accept: "application/json" },
  }).then(readData<NoteOverview>);

export const loadQuestionSession = (questionId: string) =>
  fetch(`/api/questions/${encodeURIComponent(questionId)}`, {
    headers: { Accept: "application/json" },
  }).then(readData<QuestionSession>);

export const saveQuestionAnswer = (questionId: string, content: string) =>
  fetch(`/api/questions/${encodeURIComponent(questionId)}/answer`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ content }),
  }).then(readData<{ readonly questionId: string; readonly content: string }>);

export const saveMultipleChoiceAnswer = (
  questionId: string,
  selectedId: number,
) =>
  fetch(`/api/questions/${encodeURIComponent(questionId)}/choice`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ selectedId }),
  }).then(
    readData<{
      readonly questionId: string;
      readonly selectedId: number;
      readonly correct: boolean;
    }>,
  );

export const resolveQuestion = (questionId: string) =>
  fetch(`/api/questions/${encodeURIComponent(questionId)}/resolution`, {
    method: "PATCH",
    headers: { Accept: "application/json" },
  }).then(readData<{ readonly questionId: string; readonly resolved: true }>);

export const reopenQuestion = (questionId: string) =>
  fetch(`/api/questions/${encodeURIComponent(questionId)}/resolution`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  }).then(readData<{ readonly questionId: string; readonly resolved: false }>);
