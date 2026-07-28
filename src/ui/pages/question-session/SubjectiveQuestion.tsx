import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";

import type { SubjectiveQuestionSession } from "../../../schemas/question-session";
import { routePaths } from "../../app/route-paths";
import {
  reopenQuestion,
  resolveQuestion,
  saveQuestionAnswer,
} from "../../shared/api/workspace";
import { NextQuestionLink } from "./NextQuestionLink";
import styles from "./QuestionSessionPage.module.css";

type SubjectiveQuestionProps = {
  session: SubjectiveQuestionSession;
};

export const SubjectiveQuestion = ({ session }: SubjectiveQuestionProps) => {
  const [content, setContent] = useState(session.answer ?? "");
  const [editing, setEditing] = useState(session.answer === null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  useEffect(() => {
    setContent(session.answer ?? "");
    if (session.answer === null) setEditing(true);
  }, [session.answer]);

  const submitAnswer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await saveQuestionAnswer(session.questionId, content);
      setEditing(false);
      revalidator.revalidate();
    } catch {
      setError("답변을 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeQuestion = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await resolveQuestion(session.questionId);
      navigate(routePaths.note(session.noteId));
    } catch {
      setError("질문을 정리하지 못했습니다. 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  const reopen = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await reopenQuestion(session.questionId);
      revalidator.revalidate();
    } catch {
      setError("질문을 다시 열지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.questionLabel}>
        <span aria-hidden="true" />
        {session.resolvedAt
          ? "현재 시점에서 정리됨"
          : session.feedback
            ? "피드백이 도착했습니다"
            : session.answer
              ? "피드백 기다리는 중"
              : "내 말로 설명해보기"}
      </div>
      <h1>{session.question}</h1>

      {editing && !session.resolvedAt ? (
        <form className={styles.answerForm} onSubmit={submitAnswer}>
          {session.answer ? (
            <p>
              이전 답변을 바탕으로 다시 정리해보세요. 저장하면 이전 피드백은
              새 평가를 위해 비워집니다.
            </p>
          ) : null}
          <label htmlFor="answer">답변</label>
          <textarea
            id="answer"
            value={content}
            onChange={(event) => setContent(event.currentTarget.value)}
            placeholder="지금 이해한 내용을 자신의 말로 적어보세요."
            rows={10}
            autoFocus
          />
          <div className={styles.actions}>
            {session.answer ? (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => {
                  setEditing(false);
                  setContent(session.answer ?? "");
                }}
              >
                취소
              </button>
            ) : null}
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={!content.trim() || submitting}
            >
              {submitting ? "저장 중…" : "답변 저장"}
            </button>
          </div>
        </form>
      ) : null}

      {!editing && session.answer ? (
        <section className={styles.answer} aria-labelledby="answer-heading">
          <h2 id="answer-heading">내 답변</h2>
          <p>{session.answer}</p>
        </section>
      ) : null}

      {!editing && session.answer && !session.feedback && !session.resolvedAt ? (
        <section className={styles.waiting}>
          <strong>피드백 기다리는 중</strong>
          <p>
            답변은 저장되었습니다. 외부 AI 스킬이 평가를 기록하면 이 화면과
            노트 목록에 표시됩니다.
          </p>
        </section>
      ) : null}

      {!editing && session.feedback ? (
        <section className={styles.feedback} aria-labelledby="feedback-heading">
          <h2 id="feedback-heading">피드백</h2>
          <p>{session.feedback}</p>
          {!session.resolvedAt ? (
            <div className={styles.actions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setEditing(true)}
              >
                다시 답하기
              </button>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={closeQuestion}
                disabled={submitting}
              >
                이 질문은 여기까지
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {!editing && session.answer && !session.resolvedAt ? (
        <div className={styles.nextAction}>
          <NextQuestionLink
            noteId={session.noteId}
            nextQuestionId={session.nextQuestionId}
          />
        </div>
      ) : null}

      {session.resolvedAt ? (
        <div className={styles.closedActions}>
          <Link to={routePaths.note(session.noteId)}>노트로 돌아가기</Link>
          <button type="button" onClick={reopen} disabled={submitting}>
            질문 다시 열기
          </button>
        </div>
      ) : null}
      <p className={styles.error} role="alert">{error}</p>
    </>
  );
};
