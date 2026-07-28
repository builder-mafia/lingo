import { ArrowLeft, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Link, useLoaderData, useRevalidator } from "react-router";

import { routePaths } from "../../app/route-paths";
import {
  permanentlyDeleteNote,
  restoreNote,
  type TrashData,
} from "../../shared/api/workspace";
import { TrashNoteRow } from "./TrashNoteRow";
import styles from "./TrashPage.module.css";

export const TrashPage = () => {
  const notes = useLoaderData() as TrashData;
  const { revalidate } = useRevalidator();

  const restore = useCallback(
    async (noteId: string) => {
      await restoreNote(noteId);
      revalidate();
    },
    [revalidate],
  );
  const remove = useCallback(
    async (noteId: string) => {
      await permanentlyDeleteNote(noteId);
      revalidate();
    },
    [revalidate],
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} to={routePaths.notes}>
          <ArrowLeft aria-hidden="true" />
          <span>노트</span>
        </Link>
        <div>
          <div className={styles.titleRow}>
            <h1>휴지통</h1>
            <span>{notes.length}개</span>
          </div>
          <p>제거한 노트는 영구 삭제하기 전까지 이 기기에 남아 있습니다.</p>
        </div>
      </header>

      {notes.length > 0 ? (
        <div className={styles.list} role="table" aria-label="휴지통 노트 목록">
          <div className={styles.listHeader} role="row">
            <span role="columnheader">노트</span>
            <span role="columnheader">제거한 날짜</span>
            <span role="columnheader">작업</span>
          </div>
          {notes.map((note) => (
            <TrashNoteRow
              note={note}
              onRestore={restore}
              onDelete={remove}
              key={note.id}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Trash2 aria-hidden="true" />
          <strong>휴지통이 비어 있습니다.</strong>
          <span>제거한 노트가 여기에 표시됩니다.</span>
        </div>
      )}
    </div>
  );
};
