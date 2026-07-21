import { useMemo } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";

import { routePaths } from "../../app/route-paths";
import { NoteSearch } from "../../features/note-search/NoteSearch";
import { NoteStatusSelect } from "../../features/note-status/NoteStatusSelect";
import type { WorkspaceData } from "../../shared/api/workspace";
import { toSummaryPreview } from "../../shared/markdown/summary-preview";
import styles from "./NotesPage.module.css";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(
    new Date(value),
  );

export const NotesPage = () => {
  const { notes, prompts } = useLoaderData() as WorkspaceData;
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const sort = searchParams.get("sort") ?? "recent";

  const updateParam = (key: string, value: string, defaultValue = "") => {
    const next = new URLSearchParams(searchParams);
    if (value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const visibleNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
    return notes
      .filter((note) => status === "all" || note.status === status)
      .filter((note) =>
        !normalizedQuery
          ? true
          : `${note.title} ${note.summary ?? ""}`
              .toLocaleLowerCase("ko-KR")
              .includes(normalizedQuery),
      )
      .toSorted((left, right) => {
        if (sort === "oldest") return left.updatedAt.localeCompare(right.updatedAt);
        if (sort === "title") return left.title.localeCompare(right.title, "ko-KR");
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [notes, query, sort, status]);

  return (
    <div className={styles.page}>
      <section className={styles.workspace} aria-labelledby="notes-heading">
        <header className={styles.headingRow}>
          <div>
            <h1 id="notes-heading">노트</h1>
            <span>{notes.length}개</span>
          </div>
          <NoteSearch value={query} onChange={(value) => updateParam("q", value)} />
        </header>

        <div className={styles.toolbar}>
          <label>
            <span>상태</span>
            <select value={status} onChange={(event) => updateParam("status", event.currentTarget.value, "all")}>
              <option value="all">전체</option>
              <option value="not_started">시작 전</option>
              <option value="in_progress">진행 중</option>
              <option value="completed">완료</option>
              <option value="deferred">나중에 하기</option>
            </select>
          </label>
          <label>
            <span>정렬</span>
            <select value={sort} onChange={(event) => updateParam("sort", event.currentTarget.value, "recent")}>
              <option value="recent">최근 활동</option>
              <option value="oldest">오래된 활동</option>
              <option value="title">제목</option>
            </select>
          </label>
        </div>

        <div className={styles.list} role="table" aria-label="노트 목록">
          <div className={styles.listHeader} role="row">
            <span role="columnheader">노트</span>
            <span role="columnheader">열린 질문</span>
            <span role="columnheader">최근 활동</span>
            <span role="columnheader">라벨</span>
            <span role="columnheader">상태</span>
          </div>
          {visibleNotes.map((note) => (
            <div className={styles.noteRow} role="row" key={note.id}>
              <Link className={styles.rowLink} to={routePaths.note(note.id)} aria-label={`${note.title} 노트 열기`} />
              <div className={styles.noteIdentity} role="cell">
                <span className={styles.noteIcon} aria-hidden="true">◇</span>
                <div>
                  <strong>{note.title}</strong>
                  <span>
                    {note.summary
                      ? toSummaryPreview(note.summary)
                      : "아직 요약이 없습니다."}
                  </span>
                </div>
              </div>
              <span className={styles.questionCount} role="cell">{note.openQuestionCount}</span>
              <time role="cell" dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
              <div className={styles.labels} role="cell">
                {note.labels.slice(0, 2).map((label) => <span key={label}>{label}</span>)}
                {note.labels.length > 2 ? <span>+{note.labels.length - 2}</span> : null}
              </div>
              <div role="cell"><NoteStatusSelect noteId={note.id} status={note.status} openQuestionCount={note.openQuestionCount} /></div>
            </div>
          ))}
          {visibleNotes.length === 0 ? (
            <div className={styles.empty}>
              <strong>{notes.length === 0 ? "아직 저장된 노트가 없습니다." : "조건에 맞는 노트가 없습니다."}</strong>
              <span>{notes.length === 0 ? "CLI에서 노트를 만들면 이 목록에 바로 나타납니다." : "검색어나 필터를 바꿔보세요."}</span>
              {notes.length === 0 ? <code>lingo note create --data '{`{"title":"새 주제","labels":[]}`}'</code> : null}
            </div>
          ) : null}
        </div>
      </section>

      <aside className={styles.promptPanel} aria-labelledby="prompt-heading">
        <header>
          <div>
            <span className={styles.panelMark} aria-hidden="true" />
            <h2 id="prompt-heading">지금 답할 수 있나요?</h2>
          </div>
          <span>{prompts.length}</span>
        </header>
        <div className={styles.promptList}>
          {prompts.map((prompt) => (
            <Link className={styles.prompt} to={routePaths.question(prompt.noteId, prompt.questionId)} key={prompt.questionId}>
              <span>{prompt.noteTitle}</span>
              <strong>{prompt.question}</strong>
              <p>{prompt.kind === "feedback_ready" ? "새 피드백을 확인하고 이 질문을 정리할 수 있어요." : "아직 답하지 않은 질문이에요. 지금 떠오르는 말부터 적어보세요."}</p>
              <span className={styles.promptAction}>{prompt.kind === "feedback_ready" ? "피드백 보기" : "답해보기"} →</span>
            </Link>
          ))}
          {prompts.length === 0 ? (
            <div className={styles.promptEmpty}>
              <strong>지금 제안할 질문이 없습니다.</strong>
              <span>새 질문이나 피드백이 생기면 여기에 나타납니다.</span>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
};
