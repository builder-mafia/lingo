import { AlertDialog } from "@base-ui/react/alert-dialog";
import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { memo, useState } from "react";

import type { TrashedNote } from "../../../schemas/trashed-note";
import { toContentPreview } from "../../shared/markdown/content-preview";
import styles from "./TrashPage.module.css";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type TrashNoteRowProps = {
  note: TrashedNote;
  onRestore: (noteId: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
};

export const TrashNoteRow = memo(function TrashNoteRow({
  note,
  onRestore,
  onDelete,
}: TrashNoteRowProps) {
  const [pendingAction, setPendingAction] = useState<"restore" | "delete" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  const runAction = async (
    action: "restore" | "delete",
    operation: (noteId: string) => Promise<void>,
  ) => {
    if (pendingAction) return;
    setPendingAction(action);
    setMessage("");

    try {
      await operation(note.id);
    } catch {
      setMessage(
        action === "restore"
          ? "노트를 복원하지 못했습니다."
          : "노트를 영구 삭제하지 못했습니다.",
      );
      setPendingAction(null);
    }
  };

  return (
    <div className={styles.noteRow} role="row">
      <div className={styles.noteIdentity} role="cell">
        <FileText aria-hidden="true" />
        <div>
          <strong>{note.title}</strong>
          <span>
            {note.content
              ? toContentPreview(note.content)
              : "저장된 내용이 없습니다."}
          </span>
          {message ? (
            <span className={styles.error} role="alert">
              {message}
            </span>
          ) : null}
        </div>
      </div>
      <time role="cell" dateTime={note.deletedAt}>
        {dateFormatter.format(new Date(note.deletedAt))}
      </time>
      <div className={styles.actions} role="cell">
        <button
          className={styles.restoreButton}
          type="button"
          disabled={pendingAction !== null}
          onClick={() => void runAction("restore", onRestore)}
        >
          <RotateCcw aria-hidden="true" />
          <span>{pendingAction === "restore" ? "복원 중…" : "복원"}</span>
        </button>
        <AlertDialog.Root>
          <AlertDialog.Trigger
            className={styles.deleteButton}
            disabled={pendingAction !== null}
          >
            <Trash2 aria-hidden="true" />
            <span>영구 삭제</span>
          </AlertDialog.Trigger>
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className={styles.backdrop} />
            <AlertDialog.Popup className={styles.dialog}>
              <div>
                <AlertDialog.Title className={styles.dialogTitle}>
                  노트를 영구 삭제할까요?
                </AlertDialog.Title>
                <AlertDialog.Description className={styles.dialogDescription}>
                  “{note.title}”의 내용, 질문, 답변과 피드백이 모두 삭제되며
                  되돌릴 수 없습니다.
                </AlertDialog.Description>
              </div>
              <div className={styles.dialogActions}>
                <AlertDialog.Close className={styles.cancelButton}>
                  취소
                </AlertDialog.Close>
                <AlertDialog.Close
                  className={styles.confirmDeleteButton}
                  onClick={() => void runAction("delete", onDelete)}
                >
                  영구 삭제
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </div>
  );
});
