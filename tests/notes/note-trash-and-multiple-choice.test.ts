import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

const tempDatabasePath = () =>
  `/tmp/lingo-trash-multiple-choice-${crypto.randomUUID()}.sqlite`;

test("moves notes to trash without deleting their learning data", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({
          title: "휴지통으로 보낼 노트",
          labels: [],
        });
        const question = yield* database.addSubjectiveQuestion(note.id, {
          question: "이 내용은 왜 중요할까?",
          referenceAnswer: "보존하면서 활성 작업에서 분리하기 때문이다.",
        });
        yield* database.createNote({ title: "남아 있는 노트", labels: [] });

        const moved = yield* database.trashNote(note.id);

        return {
          note,
          moved,
          stored: yield* database.findNote(note.id),
          workspace: yield* database.listNoteWorkspace(),
          overview: yield* database.findNoteOverview(note.id),
          question: yield* database.findQuestionSession(question.questionId),
          prompts: yield* database.listWorkspacePrompts(),
        };
      }),
    );

    expect(result.moved).toEqual({ noteId: result.note.id, trashed: true });
    expect(result.stored?.title).toBe("휴지통으로 보낼 노트");
    expect(result.workspace.map(({ title }) => title)).toEqual(["남아 있는 노트"]);
    expect(result.overview).toBeUndefined();
    expect(result.question).toBeUndefined();
    expect(result.prompts).toEqual([]);
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});

test("lists, restores, and permanently deletes trashed notes", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({
          title: "다시 꺼낼 노트",
          labels: ["HTTP"],
        });
        yield* database.setNoteContent(note.id, "# Cache\n\n응답 저장 정책");
        const question = yield* database.addSubjectiveQuestion(note.id, {
          question: "Cache-Control은 무엇을 제어하는가?",
          referenceAnswer: "캐시 저장과 재사용 정책을 제어한다.",
        });
        yield* database.setSubjectiveAnswer(
          question.questionId,
          "응답을 저장하고 다시 사용하는 정책을 제어한다.",
        );
        yield* database.setSubjectiveEvaluation(
          question.questionId,
          "핵심 역할을 설명했다.",
        );

        const activeRestore = yield* Effect.either(
          database.restoreNote(note.id),
        );
        yield* database.trashNote(note.id);
        const trashed = yield* database.listTrashedNotes();
        const restored = yield* database.restoreNote(note.id);
        const workspaceAfterRestore = yield* database.listNoteWorkspace();

        yield* database.trashNote(note.id);
        const deleted = yield* database.permanentlyDeleteNote(note.id);

        return {
          note,
          activeRestore,
          trashed,
          restored,
          workspaceAfterRestore,
          deleted,
          storedAfterDelete: yield* database.findNote(note.id),
          trashAfterDelete: yield* database.listTrashedNotes(),
        };
      }),
    );

    expect(result.activeRestore._tag).toBe("Left");
    expect(result.trashed).toEqual([
      {
        id: result.note.id,
        title: "다시 꺼낼 노트",
        content: "# Cache\n\n응답 저장 정책",
        deletedAt: expect.any(String),
      },
    ]);
    expect(result.restored).toEqual({ noteId: result.note.id, restored: true });
    expect(result.workspaceAfterRestore.map(({ id }) => id)).toContain(
      result.note.id,
    );
    expect(result.deleted).toEqual({ noteId: result.note.id, deleted: true });
    expect(result.storedAfterDelete).toBeUndefined();
    expect(result.trashAfterDelete).toEqual([]);
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});

test("shows, answers, and resolves multiple-choice questions", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({
          title: "Git 참조",
          labels: ["Git"],
        });
        const question = yield* database.addMultipleChoiceQuestion(note.id, {
          question: "브랜치와 태그의 차이는?",
          choices: [
            {
              order: 1,
              option: "둘 다 항상 이동한다.",
              explanation: "태그는 특정 커밋을 고정해 가리킨다.",
            },
            {
              order: 2,
              option: "브랜치는 이동하고 태그는 고정된다.",
              explanation: "브랜치는 새 커밋을 따라 이동한다.",
            },
          ],
          correctId: 2,
        });

        const overviewBefore = yield* database.findNoteOverview(note.id);
        const sessionBefore = yield* database.findQuestionSession(
          question.questionId,
        );
        const promptsBefore = yield* database.listWorkspacePrompts();
        const answer = yield* database.setMultipleChoiceAnswer(
          question.questionId,
          1,
        );
        const sessionAfter = yield* database.findQuestionSession(
          question.questionId,
        );
        const resolved = yield* database.resolveQuestion(question.questionId);
        const workspaceAfter = yield* database.listNoteWorkspace();

        return {
          note,
          question,
          overviewBefore,
          sessionBefore,
          promptsBefore,
          answer,
          sessionAfter,
          resolved,
          workspaceAfter,
        };
      }),
    );

    expect(result.overviewBefore?.questions).toEqual([
      expect.objectContaining({
        id: result.question.questionId,
        kind: "multiple_choice",
        hasAnswer: false,
      }),
    ]);
    expect(result.sessionBefore).toEqual(
      expect.objectContaining({
        kind: "multiple_choice",
        questionId: result.question.questionId,
        correctId: 2,
        selectedId: null,
        choices: [
          expect.objectContaining({ order: 1, option: "둘 다 항상 이동한다." }),
          expect.objectContaining({
            order: 2,
            option: "브랜치는 이동하고 태그는 고정된다.",
          }),
        ],
      }),
    );
    expect(result.promptsBefore).toEqual([
      expect.objectContaining({
        questionId: result.question.questionId,
        kind: "multiple_choice",
      }),
    ]);
    expect(result.answer).toEqual({
      questionId: result.question.questionId,
      selectedId: 1,
      correct: false,
    });
    expect(result.sessionAfter).toEqual(
      expect.objectContaining({ selectedId: 1 }),
    );
    expect(result.resolved).toEqual({
      questionId: result.question.questionId,
      resolved: true,
    });
    expect(result.workspaceAfter[0]).toEqual(
      expect.objectContaining({ status: "in_progress", openQuestionCount: 0 }),
    );
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
