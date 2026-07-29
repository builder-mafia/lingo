import { BookOpen } from "lucide-react";
import { memo } from "react";
import { Link, useLoaderData } from "react-router";

import type { CourseWorkspaceItem } from "../../../schemas/course-workspace";
import { routePaths } from "../../app/route-paths";
import { CourseStatusSelect } from "../../features/course-status/CourseStatusSelect";
import type { CoursesData } from "../../shared/api/workspace";
import styles from "./CoursesPage.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const CourseRow = memo(function CourseRow({ course }: { readonly course: CourseWorkspaceItem }) {
  const incompleteChapterCount = course.chapterCount - course.completedChapterCount;

  return (
    <div className={styles.courseRow} role="row">
      <div className={styles.identity} role="cell">
        <Link
          className={styles.rowLink}
          to={routePaths.course(course.id)}
          aria-label={`${course.title} 코스 열기`}
        />
        <BookOpen aria-hidden="true" />
        <div>
          <strong>{course.title}</strong>
          <span>{course.goal}</span>
        </div>
      </div>
      <span className={styles.chapterCount} role="cell">
        {course.currentChapter
          ? `${course.currentChapter.position}장 · ${course.currentChapter.title}`
          : `${course.chapterCount}장 중 ${course.completedChapterCount}장 완료`}
      </span>
      <span className={styles.questionCount} role="cell">{course.openQuestionCount}</span>
      <time role="cell" dateTime={course.createdAt}>{dateFormatter.format(new Date(course.createdAt))}</time>
      <div role="cell">
        <CourseStatusSelect
          courseId={course.id}
          status={course.status}
          incompleteChapterCount={incompleteChapterCount}
        />
      </div>
    </div>
  );
});

export const CoursesPage = () => {
  const courses = useLoaderData() as CoursesData;

  return (
    <div className={styles.page}>
      <header className={styles.headingRow}>
        <div>
          <h1>코스</h1>
          <span>{courses.length}개</span>
        </div>
      </header>

      <div className={styles.list} role="table" aria-label="코스 목록">
        <div className={styles.listHeader} role="row">
          <span role="columnheader">코스</span>
          <span role="columnheader">현재 장</span>
          <span role="columnheader">열린 질문</span>
          <span role="columnheader">만든 날짜</span>
          <span role="columnheader">상태</span>
        </div>
        {courses.map((course) => <CourseRow course={course} key={course.id} />)}
      </div>
      {courses.length === 0 ? (
        <div className={styles.empty}>
          <strong>아직 만든 코스가 없습니다.</strong>
          <span>AI와 학습할 주제와 범위를 정하면 커리큘럼이 여기에 나타납니다.</span>
          <code>lingo course create --data-file ./course.json</code>
        </div>
      ) : null}
    </div>
  );
};
