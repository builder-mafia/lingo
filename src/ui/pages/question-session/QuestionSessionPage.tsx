import { Link, useLoaderData } from "react-router";

import type { QuestionSession } from "../../../schemas/question-session";
import { routePaths } from "../../app/route-paths";
import { MarkdownContent } from "../../shared/markdown/MarkdownContent";
import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import styles from "./QuestionSessionPage.module.css";
import { SubjectiveQuestion } from "./SubjectiveQuestion";

export const QuestionSessionPage = () => {
  const session = useLoaderData() as QuestionSession;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={routePaths.notes}>노트</Link>
        <span aria-hidden="true">/</span>
        <Link to={routePaths.note(session.noteId)}>{session.noteTitle}</Link>
        <span aria-hidden="true">/</span>
        <span>질문</span>
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>
          {session.kind === "multiple_choice" ? (
            <MultipleChoiceQuestion session={session} />
          ) : (
            <SubjectiveQuestion session={session} />
          )}
        </main>

        <aside className={styles.context}>
          <details>
            <summary>노트 내용</summary>
            {session.content ? (
              <MarkdownContent
                className={styles.contextContent}
                compact
                content={session.content}
              />
            ) : (
              <p className={styles.contextEmpty}>아직 정리된 내용이 없습니다.</p>
            )}
          </details>
          {session.kind === "subjective" && session.answer ? (
            <details>
              <summary>저장한 답변</summary>
              <p>{session.answer}</p>
            </details>
          ) : null}
        </aside>
      </div>
    </div>
  );
};
