import { Toggle } from "@base-ui/react/toggle";
import { CircleDashed } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useLoaderData, useRevalidator, useSearchParams } from "react-router";

import {
  NoteFilterSelect,
  type NoteFilterOption,
} from "../../features/note-filters/NoteFilterSelect";
import { NoteSearch } from "../../features/note-search/NoteSearch";
import { NoteViewSwitch } from "../../features/note-view-switch/NoteViewSwitch";
import { NotesMenu } from "../../features/notes-menu/NotesMenu";
import { moveNoteToTrash, type WorkspaceData } from "../../shared/api/workspace";
import { filterAndSortNotes } from "./note-list";
import { NoteRow } from "./NoteRow";
import styles from "./NotesPage.module.css";

const removalMotionDurationMs = 150;
const reducedRemovalMotionDurationMs = 80;

const statusOptions: readonly NoteFilterOption[] = [
  { value: "all", label: "모든 상태" },
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "deferred", label: "나중에 하기" },
];

const sortOptions: readonly NoteFilterOption[] = [
  { value: "recent", label: "최근 활동" },
  { value: "oldest", label: "오래된 활동" },
  { value: "title", label: "제목" },
];

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
  const label = searchParams.get("label") ?? "all";
  const openQuestionsOnly = searchParams.get("questions") === "open";

  const updateParam = useCallback(
    (key: string, value: string, defaultValue = "") => {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (value === defaultValue) next.delete(key);
        else next.set(key, value);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const labelOptions = useMemo<readonly NoteFilterOption[]>(() => {
    const labels = new Set(notes.flatMap((note) => note.labels));
    if (label !== "all") labels.add(label);
    return [
      { value: "all", label: "모든 라벨" },
      ...[...labels]
        .sort((left, right) => left.localeCompare(right, "ko-KR"))
        .map((value) => ({ value, label: value })),
    ];
  }, [label, notes]);

  const visibleNotes = useMemo(() => {
    return filterAndSortNotes(notes, {
      openQuestionsOnly,
      query,
      sort,
      status,
      label,
    });
  }, [label, notes, openQuestionsOnly, query, sort, status]);

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

  const filterByLabel = useCallback(
    (nextLabel: string) => updateParam("label", nextLabel, "all"),
    [updateParam],
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
            <div className={styles.searchSlot}>
              <NoteSearch value={query} onChange={(value) => updateParam("q", value)} />
            </div>
            <div className={styles.menuSlot}>
              <NotesMenu />
            </div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <NoteViewSwitch active="list" />
          <span className={styles.toolbarDivider} aria-hidden="true" />
          <NoteFilterSelect
            label="노트 상태 필터"
            options={statusOptions}
            size="status"
            value={status}
            onValueChange={(value) => updateParam("status", value, "all")}
          />
          <NoteFilterSelect
            label="노트 정렬"
            options={sortOptions}
            size="sort"
            value={sort}
            onValueChange={(value) => updateParam("sort", value, "recent")}
          />
          {labelOptions.length > 1 ? (
            <NoteFilterSelect
              label="노트 라벨 필터"
              options={labelOptions}
              size="label"
              value={label}
              onValueChange={filterByLabel}
            />
          ) : null}
          <Toggle
            className={styles.questionFilter}
            onPressedChange={(pressed) =>
              updateParam("questions", pressed ? "open" : "")
            }
            pressed={openQuestionsOnly}
          >
            <CircleDashed aria-hidden="true" />
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
            <NoteRow
              note={note}
              onFilterLabel={filterByLabel}
              onRemove={removeNote}
              key={note.id}
            />
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
