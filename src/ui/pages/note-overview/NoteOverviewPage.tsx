import { ArrowRight, Check } from "lucide-react";
import { useMemo } from "react";
import { Link, useLoaderData } from "react-router";

import type { NoteOverview } from "../../../schemas/question-session";
import { routePaths } from "../../app/route-paths";
import { NoteStatusSelect } from "../../features/note-status/NoteStatusSelect";
import { NoteMemoEditor } from "../../features/note-memo/NoteMemoEditor";
import {
  NoteSources,
  type DisplaySource,
} from "../../features/note-sources/NoteSources";
import { extractLegacySources } from "../../features/note-sources/legacy-sources";
import { MarkdownContent } from "../../shared/markdown/MarkdownContent";
import styles from "./NoteOverviewPage.module.css";

export const NoteOverviewPage = () => {
  const note = useLoaderData() as NoteOverview;
  const legacyContent = useMemo(
    () => extractLegacySources(note.content ?? ""),
    [note.content],
  );
  const sources = useMemo(() => {
    const byUrl = new Map<string, DisplaySource>(
      note.sources.map((source) => [source.url, source] as const),
    );
    legacyContent.sources.forEach((source) => {
      if (!byUrl.has(source.url)) byUrl.set(source.url, source);
    });
    return [...byUrl.values()];
  }, [legacyContent.sources, note.sources]);
  const openQuestions = note.questions.filter((question) => !question.resolvedAt);
  const resolvedQuestions = note.questions.filter((question) => question.resolvedAt);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {note.courseContext ? (
          <>
            <Link to={routePaths.courses}>코스</Link>
            <span aria-hidden="true">/</span>
            <Link to={routePaths.course(note.courseContext.courseId)}>{note.courseContext.courseTitle}</Link>
            <span aria-hidden="true">/</span>
            <span>{note.courseContext.position}장</span>
            <span aria-hidden="true">/</span>
          </>
        ) : (
          <>
            <Link to={routePaths.notes}>노트</Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span>{note.title}</span>
        <div className={styles.status}><NoteStatusSelect noteId={note.id} status={note.status} openQuestionCount={openQuestions.length} /></div>
      </header>

      <main className={styles.content}>
        <div className={styles.titleBlock}>
          <h1>{note.title}</h1>
          <div className={styles.labels}>{note.labels.map((label) => <span key={label}>{label}</span>)}</div>
        </div>

        <section className={styles.section} aria-labelledby="content-heading">
          <h2 id="content-heading">내용</h2>
          {legacyContent.content ? (
            <MarkdownContent className={styles.noteContent} content={legacyContent.content} />
          ) : (
            <p className={styles.mutedContent}>아직 정리된 내용이 없습니다.</p>
          )}
          <NoteSources sources={sources} />
        </section>

        <section className={styles.section} aria-labelledby="memo-heading">
          <NoteMemoEditor
            key={note.id}
            noteId={note.id}
            initialMemo={note.memo?.content ?? ""}
          />
        </section>

        {note.questions.length > 0 ? (
          <section className={styles.section} aria-labelledby="questions-heading">
            <h2 id="questions-heading">질문</h2>
            <div className={styles.questions}>
              {openQuestions.map((question) => (
                <Link className={styles.question} to={routePaths.question(note.id, question.id)} key={question.id}>
                  <span className={styles.openMark} aria-hidden="true" />
                  <strong>{question.question}</strong>
                  <span>
                    {question.kind === "multiple_choice"
                      ? question.hasAnswer
                        ? "결과 다시 보기"
                        : "선택해보기"
                      : question.hasFeedback
                        ? "피드백 확인"
                        : question.hasAnswer
                          ? "피드백 기다리는 중"
                          : "답해보기"}
                  </span>
                </Link>
              ))}
              {resolvedQuestions.map((question) => (
                <Link className={`${styles.question} ${styles.resolvedQuestion}`} to={routePaths.question(note.id, question.id)} key={question.id}>
                  <span className={styles.resolvedMark} aria-label="답변 완료">
                    <Check aria-hidden="true" />
                  </span>
                  <strong>{question.question}</strong>
                  <span>다시 보기</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {note.courseContext ? (
          <nav className={styles.courseActions} aria-label="코스 학습 이동">
            <Link to={routePaths.course(note.courseContext.courseId)}>코스로 돌아가기</Link>
            {note.courseContext.nextChapter ? (
              <Link className={styles.nextChapter} to={routePaths.note(note.courseContext.nextChapter.noteId)}>
                다음 장 · {note.courseContext.nextChapter.title}
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
    </div>
  );
};
