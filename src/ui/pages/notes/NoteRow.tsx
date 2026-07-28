import { ContextMenu } from "@base-ui/react/context-menu";
import { FileText, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { Link } from "react-router";

import type { NoteWorkspaceItem } from "../../../schemas/note-workspace";
import { routePaths } from "../../app/route-paths";
import { NoteStatusSelect } from "../../features/note-status/NoteStatusSelect";
import { toContentPreview } from "../../shared/markdown/content-preview";
import styles from "./NotesPage.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
});

const formatDate = (value: string) => dateFormatter.format(new Date(value));

type NoteRowProps = {
  note: NoteWorkspaceItem;
  onRemove: (noteId: string) => Promise<void>;
};

export const NoteRow = memo(function NoteRow({ note, onRemove }: NoteRowProps) {
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState("");

  const remove = async () => {
    if (removing) return;
    setRemoving(true);
    setMessage("");
    try {
      await onRemove(note.id);
    } catch {
      setMessage("노트를 휴지통으로 옮기지 못했습니다.");
      setRemoving(false);
    }
  };

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className={styles.noteRow}
        role="row"
        data-removing={removing ? "" : undefined}
      >
        <Link
          className={styles.rowLink}
          to={routePaths.note(note.id)}
          aria-label={`${note.title} 노트 열기`}
        />
        <div className={styles.noteIdentity} role="cell">
          <FileText className={styles.noteIcon} aria-hidden="true" />
          <div>
            <strong>{note.title}</strong>
            {message ? (
              <span className={styles.rowError} role="alert">{message}</span>
            ) : (
              <span>
                {note.content
                  ? toContentPreview(note.content)
                  : "아직 정리된 내용이 없습니다."}
              </span>
            )}
          </div>
        </div>
        <span className={styles.questionCount} role="cell">
          {note.openQuestionCount}
        </span>
        <time role="cell" dateTime={note.updatedAt}>
          {formatDate(note.updatedAt)}
        </time>
        <div className={styles.labels} role="cell">
          {note.labels.slice(0, 2).map((label) => (
            <span key={label}>{label}</span>
          ))}
          {note.labels.length > 2 ? (
            <span>+{note.labels.length - 2}</span>
          ) : null}
        </div>
        <div role="cell">
          <NoteStatusSelect
            noteId={note.id}
            status={note.status}
            openQuestionCount={note.openQuestionCount}
          />
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className={styles.menuPositioner} sideOffset={4}>
          <ContextMenu.Popup className={styles.contextMenu}>
            <ContextMenu.Item
              className={styles.contextMenuItem}
              disabled={removing}
              onClick={() => void remove()}
            >
              <Trash2 aria-hidden="true" />
              <span>{removing ? "옮기는 중…" : "제거하기"}</span>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
});
