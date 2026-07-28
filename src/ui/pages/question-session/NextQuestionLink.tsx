import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { routePaths } from "../../app/route-paths";
import styles from "./QuestionSessionPage.module.css";

type NextQuestionLinkProps = {
  noteId: string;
  nextQuestionId: string | null;
};

export const NextQuestionLink = ({
  noteId,
  nextQuestionId,
}: NextQuestionLinkProps) => (
  <Link
    className={styles.nextQuestionButton}
    to={
      nextQuestionId
        ? routePaths.question(noteId, nextQuestionId)
        : routePaths.note(noteId)
    }
  >
    {nextQuestionId ? "다음 질문" : "노트로 돌아가기"}
    {nextQuestionId ? <ArrowRight aria-hidden="true" /> : null}
  </Link>
);
