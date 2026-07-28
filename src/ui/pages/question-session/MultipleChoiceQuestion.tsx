import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";

import type { MultipleChoiceQuestionSession } from "../../../schemas/question-session";
import { routePaths } from "../../app/route-paths";
import {
  reopenQuestion,
  resolveQuestion,
  saveMultipleChoiceAnswer,
} from "../../shared/api/workspace";
import styles from "./QuestionSessionPage.module.css";

type MultipleChoiceQuestionProps = {
  session: MultipleChoiceQuestionSession;
};

export const MultipleChoiceQuestion = ({
  session,
}: MultipleChoiceQuestionProps) => {
  const [selectedId, setSelectedId] = useState<number | null>(
    session.selectedId,
  );
  const [editing, setEditing] = useState(session.selectedId === null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedId(session.selectedId);
    setEditing(session.selectedId === null);
  }, [session.selectedId]);

  const submitChoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedId === null || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await saveMultipleChoiceAnswer(session.questionId, selectedId);
      setEditing(false);
      revalidator.revalidate();
    } catch {
      setError("선택을 저장하지 못했습니다. 다시 시도해 주세요.");
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

  const answered = session.selectedId !== null;
  const correct = session.selectedId === session.correctId;

  return (
    <>
      <div className={styles.questionLabel}>
        <span aria-hidden="true" />
        {session.resolvedAt
          ? "현재 시점에서 정리됨"
          : answered
            ? correct
              ? "정확하게 짚었습니다"
              : "다시 살펴볼 지점을 찾았습니다"
            : "선택지로 확인해보기"}
      </div>
      <h1>{session.question}</h1>

      <form className={styles.choiceForm} onSubmit={submitChoice}>
        <fieldset disabled={!editing || submitting || Boolean(session.resolvedAt)}>
          <legend>답을 하나 선택하세요.</legend>
          <div className={styles.choices}>
            {session.choices.map((choice) => {
              const isSelected = selectedId === choice.order;
              const isSavedSelection = session.selectedId === choice.order;
              const isCorrect = choice.order === session.correctId;
              const result = answered
                ? isCorrect
                  ? "correct"
                  : isSavedSelection
                    ? "incorrect"
                    : "neutral"
                : "neutral";

              return (
                <label className={styles.choice} data-result={result} key={choice.order}>
                  <input
                    type="radio"
                    name="choice"
                    value={choice.order}
                    checked={isSelected}
                    onChange={() => setSelectedId(choice.order)}
                  />
                  <span className={styles.choiceOrder}>{choice.order}</span>
                  <span className={styles.choiceContent}>
                    <strong>{choice.option}</strong>
                    {answered ? (
                      <span
                        className={`${styles.explanation} ${styles.resultReveal}`}
                      >
                        <span>해설</span>
                        {choice.explanation}
                      </span>
                    ) : null}
                  </span>
                  {answered && isCorrect ? (
                    <span className={styles.resultIconReveal}>
                      <CheckCircle2 className={styles.resultIcon} aria-label="정답" />
                    </span>
                  ) : null}
                  {answered && isSavedSelection && !isCorrect ? (
                    <span className={styles.resultIconReveal}>
                      <XCircle className={styles.resultIcon} aria-label="선택한 오답" />
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        {!answered || editing ? (
          <div className={styles.actions}>
            {answered ? (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => {
                  setEditing(false);
                  setSelectedId(session.selectedId);
                }}
              >
                취소
              </button>
            ) : null}
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={selectedId === null || submitting}
            >
              {submitting ? "확인 중…" : "선택 확인"}
            </button>
          </div>
        ) : null}
      </form>

      {answered && !editing && !session.resolvedAt ? (
        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => setEditing(true)}
          >
            다시 선택하기
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
