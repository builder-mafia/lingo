import { Link, useLoaderData } from "react-router";

import type { NoteOverview } from "../../../schemas/question-session";
import { routePaths } from "../../app/route-paths";
import { NoteStatusSelect } from "../../features/note-status/NoteStatusSelect";
import styles from "./NoteOverviewPage.module.css";

export const NoteOverviewPage = () => {
  const note = useLoaderData() as NoteOverview;
  const openQuestions = note.questions.filter((question) => !question.resolvedAt);
  const resolvedQuestions = note.questions.filter((question) => question.resolvedAt);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={routePaths.notes}>노트</Link>
        <span aria-hidden="true">/</span>
        <span>{note.title}</span>
        <div className={styles.status}><NoteStatusSelect noteId={note.id} status={note.status} openQuestionCount={openQuestions.length} /></div>
      </header>

      <main className={styles.content}>
        <div className={styles.titleBlock}>
          <h1>{note.title}</h1>
          <div className={styles.labels}>{note.labels.map((label) => <span key={label}>{label}</span>)}</div>
        </div>

        <section className={styles.section} aria-labelledby="summary-heading">
          <h2 id="summary-heading">요약</h2>
          <p className={note.summary ? styles.summary : styles.mutedSummary}>
            {note.summary ?? "아직 정리된 요약이 없습니다."}
          </p>
        </section>

        <section className={styles.section} aria-labelledby="open-heading">
          <div className={styles.sectionHeading}>
            <h2 id="open-heading">이어갈 질문</h2>
            <span>{openQuestions.length}</span>
          </div>
          <div className={styles.questions}>
            {openQuestions.map((question) => (
              <Link className={styles.question} to={routePaths.question(note.id, question.id)} key={question.id}>
                <span className={styles.openMark} aria-hidden="true" />
                <strong>{question.question}</strong>
                <span>{question.hasFeedback ? "피드백 확인" : question.hasAnswer ? "피드백 기다리는 중" : "답해보기"} →</span>
              </Link>
            ))}
            {openQuestions.length === 0 ? <p className={styles.empty}>현재 이어갈 질문이 없습니다.</p> : null}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="resolved-heading">
          <div className={styles.sectionHeading}>
            <h2 id="resolved-heading">정리한 질문</h2>
            <span>{resolvedQuestions.length}</span>
          </div>
          <div className={styles.questions}>
            {resolvedQuestions.map((question) => (
              <Link className={styles.question} to={routePaths.question(note.id, question.id)} key={question.id}>
                <span className={styles.resolvedMark} aria-hidden="true">✓</span>
                <strong>{question.question}</strong>
                <span>다시 보기 →</span>
              </Link>
            ))}
            {resolvedQuestions.length === 0 ? <p className={styles.empty}>아직 정리한 질문이 없습니다.</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
};
