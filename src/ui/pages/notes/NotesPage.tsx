import { Toggle } from "@base-ui/react/toggle";
import { CircleHelp, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Link, useLoaderData, useRevalidator, useSearchParams } from "react-router";

import { routePaths } from "../../app/route-paths";
import { NoteSearch } from "../../features/note-search/NoteSearch";
import { moveNoteToTrash, type WorkspaceData } from "../../shared/api/workspace";
import { filterAndSortNotes } from "./note-list";
import { NoteRow } from "./NoteRow";
import styles from "./NotesPage.module.css";

const removalMotionDurationMs = 150;
const reducedRemovalMotionDurationMs = 80;

const waitForRemovalMotion = () =>
  new Promise<void>((resolve) => {
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? reducedRemovalMotionDurationMs
      : removalMotionDurationMs;
    window.setTimeout(resolve, duration);
  });

export const NotesPage = () => {
  const { notes } = useLoaderData() as WorkspaceData;
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";
  const sort = searchParams.get("sort") ?? "recent";
  const openQuestionsOnly = searchParams.get("questions") === "open";

  const updateParam = (key: string, value: string, defaultValue = "") => {
    const next = new URLSearchParams(searchParams);
    if (value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const visibleNotes = useMemo(() => {
    return filterAndSortNotes(notes, {
      openQuestionsOnly,
      query,
      sort,
      status,
    });
  }, [notes, openQuestionsOnly, query, sort, status]);

  const notesWithOpenQuestions = notes.reduce(
    (count, note) => count + (note.openQuestionCount > 0 ? 1 : 0),
    0,
  );

  const removeNote = useCallback(
    async (noteId: string) => {
      await Promise.all([
        moveNoteToTrash(noteId),
        waitForRemovalMotion(),
      ]);
      revalidator.revalidate();
    },
    [revalidator],
  );

  return (
    <div className={styles.page}>
      <section className={styles.workspace} aria-labelledby="notes-heading">
        <header className={styles.headingRow}>
          <div className={styles.headingTitle}>
            <h1 id="notes-heading">노트</h1>
            <span>{notes.length}개</span>
          </div>
          <div className={styles.headingActions}>
            <Link className={styles.trashLink} to={routePaths.trash}>
              <Trash2 aria-hidden="true" />
              <span>휴지통</span>
            </Link>
            <NoteSearch value={query} onChange={(value) => updateParam("q", value)} />
          </div>
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
          <Toggle
            className={styles.questionFilter}
            onPressedChange={(pressed) =>
              updateParam("questions", pressed ? "open" : "")
            }
            pressed={openQuestionsOnly}
          >
            <CircleHelp aria-hidden="true" />
            <span>질문 있는 노트</span>
            <span className={styles.filterCount}>{notesWithOpenQuestions}</span>
          </Toggle>
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
            <NoteRow note={note} onRemove={removeNote} key={note.id} />
          ))}
        </div>
        {visibleNotes.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              {notes.length === 0
                ? "아직 저장된 노트가 없습니다."
                : openQuestionsOnly
                  ? "질문이 있는 노트가 없습니다."
                  : "조건에 맞는 노트가 없습니다."}
            </strong>
            <span>
              {notes.length === 0
                ? "CLI에서 노트를 만들면 이 목록에 바로 나타납니다."
                : openQuestionsOnly
                  ? "전체 노트를 보려면 질문 필터를 꺼주세요."
                  : "검색어나 필터를 바꿔보세요."}
            </span>
            {notes.length === 0 ? <code>lingo note create --data '{`{"title":"새 주제","labels":[]}`}'</code> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
};
