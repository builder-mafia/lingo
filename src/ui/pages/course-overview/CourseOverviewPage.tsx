import { BookOpen, Check, Trash2 } from "lucide-react";
import { Link, useLoaderData } from "react-router";

import type { CourseOverview } from "../../../schemas/course-workspace";
import { routePaths } from "../../app/route-paths";
import { CourseStatusSelect } from "../../features/course-status/CourseStatusSelect";
import styles from "./CourseOverviewPage.module.css";

const chapterStatusLabels = {
  not_started: "시작 전",
  in_progress: "진행 중",
  completed: "완료",
  deferred: "나중에 하기",
} as const;

export const CourseOverviewPage = () => {
  const course = useLoaderData() as CourseOverview;
  const completedChapterCount = course.chapters.filter(
    (chapter) => chapter.status === "completed",
  ).length;
  const incompleteChapterCount = course.chapters.length - completedChapterCount;
  const currentChapter =
    course.chapters.find((chapter) => chapter.status === "in_progress" && !chapter.trashed) ??
    course.chapters.find((chapter) => chapter.status === "not_started" && !chapter.trashed);

  return (
    <div className={styles.page}>
      <header className={styles.breadcrumb}>
        <nav aria-label="현재 위치">
          <ol>
            <li><Link to={routePaths.courses}>코스</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">{course.title}</li>
          </ol>
        </nav>
        <CourseStatusSelect
          courseId={course.id}
          status={course.status}
          incompleteChapterCount={incompleteChapterCount}
        />
      </header>

      <main className={styles.content}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>학습 경로</span>
            <h1>{course.title}</h1>
            <p>{course.goal}</p>
          </div>
          {currentChapter ? (
            <Link className={styles.primaryAction} to={routePaths.note(currentChapter.noteId)}>
              {currentChapter.position}장 · {currentChapter.title} 열기
            </Link>
          ) : null}
        </section>

        <section className={styles.curriculum} aria-labelledby="curriculum-heading">
          <header>
            <div>
              <h2 id="curriculum-heading">커리큘럼</h2>
              <span>{course.chapters.length}장 중 {completedChapterCount}장 완료</span>
            </div>
            <span>순서는 권장 경로이며 모든 장을 자유롭게 열 수 있습니다.</span>
          </header>
          <div className={styles.chapterList}>
            {course.chapters.length === 0 ? (
              <div className={styles.emptyCourse}>
                <strong>이 코스에 남아 있는 장이 없습니다.</strong>
                <span>영구 삭제한 장은 되돌릴 수 없습니다. 필요하면 새 코스를 만들어주세요.</span>
              </div>
            ) : null}
            {course.chapters.map((chapter) => {
              const isCurrent = currentChapter?.noteId === chapter.noteId;
              const questionFact = chapter.openQuestionCount > 0
                ? `열린 질문 ${chapter.openQuestionCount}개`
                : "열린 질문 없음";
              const content = (
                <>
                  <span className={styles.chapterNumber}>{chapter.position}</span>
                  <span className={styles.chapterIcon} aria-hidden="true">
                    {chapter.trashed ? <Trash2 /> : chapter.status === "completed" ? <Check /> : <BookOpen />}
                  </span>
                  <span className={styles.chapterIdentity}>
                    <strong>{chapter.title}</strong>
                    <span>{chapter.objective}</span>
                  </span>
                  <span className={styles.chapterFacts}>
                    {chapter.trashed
                      ? <><span>휴지통에 있음</span><Link to={routePaths.trash}>휴지통에서 복원</Link></>
                      : `${chapterStatusLabels[chapter.status]}${isCurrent ? " · 현재" : ""} · ${questionFact}`}
                  </span>
                </>
              );

              return chapter.trashed ? (
                <div className={styles.chapter} data-trashed key={chapter.noteId}>{content}</div>
              ) : (
                <Link className={styles.chapter} to={routePaths.note(chapter.noteId)} key={chapter.noteId}>{content}</Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
