import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

const tempDatabasePath = () =>
  `/tmp/lingo-course-${crypto.randomUUID()}.sqlite`;

test("creates a course and its ordered chapter notes atomically", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const created = yield* database.createCourse({
          title: "Effect 핵심",
          goal: "Effect의 실행 모델을 설명하고 적용한다.",
          chapters: [
            {
              title: "동기 Effect",
              objective: "동기 Effect의 생성과 실행을 구분한다.",
              labels: ["Effect"],
            },
            {
              title: "비동기 Effect",
              objective: "비동기 작업의 성공과 실패를 표현한다.",
              labels: ["Effect", "Async"],
            },
          ],
        });
        const courses = yield* database.listCourses();
        const overview = yield* database.findCourseOverview(created.courseId);
        const question = yield* database.addSubjectiveQuestion(
          created.chapters[0]!.noteId,
          { question: "Effect는 언제 실행되는가?", referenceAnswer: "runtime에서 실행된다." },
        );
        const noteOverview = yield* database.findNoteOverview(created.chapters[0]!.noteId);
        const questionSession = yield* database.findQuestionSession(question.questionId);
        const notes = yield* database.listNoteWorkspace();
        return { created, courses, overview, notes, noteOverview, questionSession };
      }),
    );

    expect(result.created).toMatchObject({
      title: "Effect 핵심",
      chapterCount: 2,
      chapters: [
        { position: 1, title: "동기 Effect", noteId: expect.any(String) },
        { position: 2, title: "비동기 Effect", noteId: expect.any(String) },
      ],
    });
    expect(result.courses).toEqual([
      expect.objectContaining({
        id: result.created.courseId,
        title: "Effect 핵심",
        status: "not_started",
        chapterCount: 2,
        completedChapterCount: 0,
        currentChapter: { position: 1, title: "동기 Effect" },
      }),
    ]);
    expect(result.overview).toEqual(
      expect.objectContaining({
        id: result.created.courseId,
        goal: "Effect의 실행 모델을 설명하고 적용한다.",
        chapters: [
          expect.objectContaining({
            position: 1,
            title: "동기 Effect",
            objective: "동기 Effect의 생성과 실행을 구분한다.",
            labels: ["Effect"],
            status: "not_started",
          }),
          expect.objectContaining({
            position: 2,
            title: "비동기 Effect",
            labels: ["Effect", "Async"],
          }),
        ],
      }),
    );
    expect(
      result.notes.find((note) => note.courseContext?.position === 1)
        ?.courseContext,
    ).toEqual({
      courseId: result.created.courseId,
      courseTitle: "Effect 핵심",
      position: 1,
    });
    expect(result.noteOverview?.courseContext).toEqual({
      courseId: result.created.courseId,
      courseTitle: "Effect 핵심",
      position: 1,
      nextChapter: {
        noteId: result.created.chapters[1]!.noteId,
        title: "비동기 Effect",
        position: 2,
      },
    });
    expect(result.questionSession?.courseContext).toEqual(
      result.noteOverview?.courseContext,
    );
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});

test("updates course workflow status without auto-completing it", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const course = yield* database.createCourse({
          title: "Effect 핵심",
          goal: "Effect를 익힌다.",
          chapters: [
            { title: "동기 Effect", objective: "동기 실행을 익힌다.", labels: [] },
            { title: "비동기 Effect", objective: "비동기 실행을 익힌다.", labels: [] },
          ],
        });
        const updated = yield* database.setCourseStatus(course.courseId, "completed");
        const overview = yield* database.findCourseOverview(course.courseId);
        return { updated, overview };
      }),
    );

    expect(result.updated).toEqual({
      courseId: expect.any(String),
      status: "completed",
    });
    expect(result.overview?.status).toBe("completed");
    expect(result.overview?.chapters[0]?.status).toBe("not_started");
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});

test("starts a course on its first chapter answer without reopening a completed course", async () => {
  const databasePath = tempDatabasePath();
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const statuses = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const course = yield* database.createCourse({
          title: "Effect 핵심",
          goal: "Effect를 익힌다.",
          chapters: [
            { title: "동기 Effect", objective: "동기 실행을 익힌다.", labels: [] },
            { title: "비동기 Effect", objective: "비동기 실행을 익힌다.", labels: [] },
          ],
        });
        const question = yield* database.addSubjectiveQuestion(
          course.chapters[0]!.noteId,
          { question: "Effect는 언제 실행되는가?", referenceAnswer: "runtime에서 실행된다." },
        );
        yield* database.setSubjectiveAnswer(question.questionId, "runtime에서 실행된다.");
        const started = yield* database.findCourseOverview(course.courseId);
        yield* database.setCourseStatus(course.courseId, "completed");
        yield* database.setSubjectiveAnswer(question.questionId, "Effect.runSync 같은 runtime에서 실행된다.");
        const completed = yield* database.findCourseOverview(course.courseId);
        return { started: started?.status, completed: completed?.status };
      }),
    );

    expect(statuses).toEqual({ started: "in_progress", completed: "completed" });
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
