import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

const tempDatabasePath = () =>
  `/tmp/lingo-workspace-${crypto.randomUUID()}.sqlite`;

test("lists real note workspace data and updates workflow status", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({
          title: "Effect 오류 모델",
          labels: ["TypeScript", "Architecture"],
        });
        yield* database.setNoteContent(
          note.id,
          "실패 타입을 값으로 다루는 Effect의 오류 모델을 정리한다.",
        );
        const question = yield* database.addSubjectiveQuestion(note.id, {
          question: "예외와 typed error는 복구 방식이 어떻게 다른가?",
          referenceAnswer: "호출자가 오류 타입에 따라 복구 전략을 선택할 수 있다.",
        });

        const before = yield* database.listNoteWorkspace();
        const overview = yield* database.findNoteOverview(note.id);
        const sessionBefore = yield* database.findQuestionSession(
          question.questionId,
        );
        yield* database.setSubjectiveAnswer(
          question.questionId,
          "호출자가 오류 타입을 보고 복구할 수 있다.",
        );
        yield* database.setSubjectiveEvaluation(
          question.questionId,
          "복구 가능성을 분명하게 설명했습니다.",
        );
        const sessionWithFeedback = yield* database.findQuestionSession(
          question.questionId,
        );
        yield* database.setSubjectiveAnswer(
          question.questionId,
          "오류를 값으로 다루면 타입에 따라 복구 전략을 선택할 수 있다.",
        );
        const sessionAfterRetry = yield* database.findQuestionSession(
          question.questionId,
        );
        const updated = yield* database.resolveQuestion(
          question.questionId,
        );
        const afterResolve = yield* database.listNoteWorkspace();
        const reopened = yield* database.reopenQuestion(
          question.questionId,
        );
        const afterReopen = yield* database.listNoteWorkspace();
        const prompts = yield* database.listWorkspacePrompts();

        return {
          note,
          question,
          before,
          overview,
          sessionBefore,
          sessionWithFeedback,
          sessionAfterRetry,
          updated,
          afterResolve,
          reopened,
          afterReopen,
          prompts,
        };
      }),
    );

    expect(result.before).toHaveLength(1);
    expect(result.before[0]).toMatchObject({
      id: result.note.id,
      title: "Effect 오류 모델",
      content: "실패 타입을 값으로 다루는 Effect의 오류 모델을 정리한다.",
      labels: ["TypeScript", "Architecture"],
      status: "not_started",
      openQuestionCount: 1,
    });
    expect(result.overview).toEqual(
      expect.objectContaining({
        id: result.note.id,
        questions: [
          expect.objectContaining({
            id: result.question.questionId,
            hasAnswer: false,
            hasFeedback: false,
          }),
        ],
      }),
    );
    expect(result.sessionBefore).toEqual(
      expect.objectContaining({
        questionId: result.question.questionId,
        answer: null,
        feedback: null,
      }),
    );
    expect(result.sessionWithFeedback).toEqual(
      expect.objectContaining({
        answer: "호출자가 오류 타입을 보고 복구할 수 있다.",
        feedback: "복구 가능성을 분명하게 설명했습니다.",
      }),
    );
    expect(result.sessionAfterRetry).toEqual(
      expect.objectContaining({
        answer: "오류를 값으로 다루면 타입에 따라 복구 전략을 선택할 수 있다.",
        feedback: null,
      }),
    );
    expect(result.updated).toEqual({
      questionId: result.question.questionId,
      resolved: true,
    });
    expect(result.afterResolve[0]?.status).toBe("in_progress");
    expect(result.afterResolve[0]?.openQuestionCount).toBe(0);
    expect(result.reopened).toEqual({
      questionId: result.question.questionId,
      resolved: false,
    });
    expect(result.afterReopen[0]?.openQuestionCount).toBe(1);
    expect(result.prompts).toEqual([]);
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});

test("points an answered session to the next unanswered question", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const note = yield* database.createNote({
          title: "HTTP cache",
          labels: [],
        });
        const first = yield* database.addSubjectiveQuestion(note.id, {
          question: "Cache-Control은 무엇을 제어하는가?",
          referenceAnswer: "응답을 어디에 얼마나 오래 저장할지 제어한다.",
        });
        const second = yield* database.addMultipleChoiceQuestion(note.id, {
          question: "재검증에 사용하는 HTTP header는 무엇인가?",
          choices: [
            { order: 1, option: "ETag", explanation: "validator 역할을 한다." },
            { order: 2, option: "Location", explanation: "redirect 위치를 나타낸다." },
          ],
          correctId: 1,
        });

        yield* database.setSubjectiveAnswer(first.questionId, "저장 정책을 제어한다.");
        const afterFirst = yield* database.findQuestionSession(first.questionId);
        yield* database.setMultipleChoiceAnswer(second.questionId, 1);
        const afterAll = yield* database.findQuestionSession(first.questionId);

        return { second, afterFirst, afterAll };
      }),
    );

    expect(result.afterFirst?.nextQuestionId).toBe(result.second.questionId);
    expect(result.afterAll?.nextQuestionId).toBeNull();
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
