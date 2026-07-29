import { Effect } from "effect";

import { Database } from "../../layers/database";
import { JsonInput, type JsonInputOptions } from "../../layers/json-input";
import { createCourseSchema } from "../../schemas/course";
import { CliError } from "../errors";

const localCourseUrl = (courseId: string) =>
  `http://127.0.0.1:4312/courses/${courseId}`;
const localNoteUrl = (noteId: string) =>
  `http://127.0.0.1:4312/notes/${noteId}`;

export const createCourse = (inputOptions: JsonInputOptions) =>
  Effect.gen(function* () {
    const input = yield* (yield* JsonInput).read(inputOptions);
    const parsed = createCourseSchema.safeParse(input);
    if (!parsed.success) {
      return yield* Effect.fail(new CliError("Invalid course."));
    }

    const course = yield* (yield* Database).createCourse(parsed.data);
    return {
      ...course,
      courseUrl: localCourseUrl(course.courseId),
      chapters: course.chapters.map((chapter) => ({
        ...chapter,
        noteUrl: localNoteUrl(chapter.noteId),
      })),
    };
  });
