import { rmSync } from "node:fs";
import { Effect, ManagedRuntime } from "effect";
import { expect, test } from "bun:test";

import { Database, makeDatabaseLayer } from "../../src/layers/database";

test("builds a deterministic map from explicit relations and adjacent course chapters", async () => {
  const databasePath = `/tmp/lingo-knowledge-map-${crypto.randomUUID()}.sqlite`;
  const runtime = ManagedRuntime.make(makeDatabaseLayer(databasePath));

  try {
    const result = await runtime.runPromise(
      Effect.gen(function* () {
        const database = yield* Database;
        const course = yield* database.createCourse({
          title: "Effect 핵심",
          goal: "Effect 실행 모델을 연결해 이해한다.",
          chapters: [
            { title: "Effect 생성", objective: "동기 Effect를 만든다.", labels: ["Effect"] },
            { title: "Fiber 실행", objective: "Fiber 실행을 설명한다.", labels: ["Effect"] },
            { title: "Interruption", objective: "취소 경계를 설명한다.", labels: ["Effect"] },
          ],
        });
        const cache = yield* database.createNote({
          title: "Cache invalidation",
          labels: ["Architecture"],
        });
        const stale = yield* database.createNote({
          title: "Stale data",
          labels: ["Architecture"],
        });
        const isolated = yield* database.createNote({
          title: "CQRS",
          labels: ["Architecture"],
        });
        const explicit = yield* database.addNoteRelation(
          course.chapters[0]!.noteId,
          cache.id,
        );
        yield* database.addNoteRelation(cache.id, stale.id);
        yield* database.trashNote(stale.id);

        const map = yield* database.readKnowledgeMap();
        yield* database.trashNote(course.chapters[1]!.noteId);
        const withMiddleChapterTrashed = yield* database.readKnowledgeMap();

        return { course, cache, stale, isolated, explicit, map, withMiddleChapterTrashed };
      }),
    );

    expect(result.map.nodes.map(({ id }) => id)).toContain(result.isolated.id);
    expect(result.map.nodes.map(({ id }) => id)).not.toContain(result.stale.id);
    expect(result.map.edges).toContainEqual({
      id: result.explicit.id,
      sourceNoteId: result.explicit.noteAId,
      targetNoteId: result.explicit.noteBId,
      kind: "related",
    });
    expect(result.map.edges.filter(({ kind }) => kind === "course_sequence")).toEqual([
      {
        id: `course:${result.course.courseId}:1:2`,
        sourceNoteId: result.course.chapters[0]!.noteId,
        targetNoteId: result.course.chapters[1]!.noteId,
        kind: "course_sequence",
      },
      {
        id: `course:${result.course.courseId}:2:3`,
        sourceNoteId: result.course.chapters[1]!.noteId,
        targetNoteId: result.course.chapters[2]!.noteId,
        kind: "course_sequence",
      },
    ]);
    expect(
      result.withMiddleChapterTrashed.edges.filter(
        ({ kind }) => kind === "course_sequence",
      ),
    ).toEqual([]);
    expect(result.map.edges).toHaveLength(3);
  } finally {
    await runtime.dispose();
    rmSync(databasePath, { force: true });
  }
});
