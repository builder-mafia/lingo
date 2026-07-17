import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Select } from "@base-ui/react/select";
import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";

import type { NoteStatus } from "../../../schemas/note-status";
import { updateNoteStatus } from "../../shared/api/workspace";
import styles from "./NoteStatusSelect.module.css";

const statusOptions: readonly { value: NoteStatus; label: string }[] = [
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "deferred", label: "나중에 하기" },
];

type NoteStatusSelectProps = {
  readonly noteId: string;
  readonly status: NoteStatus;
  readonly openQuestionCount?: number;
};

export const NoteStatusSelect = ({
  noteId,
  status,
  openQuestionCount = 0,
}: NoteStatusSelectProps) => {
  const [value, setValue] = useState(status);
  const [message, setMessage] = useState("");
  const [completionWarningOpen, setCompletionWarningOpen] = useState(false);
  const revalidator = useRevalidator();

  useEffect(() => setValue(status), [status]);

  const persistStatus = async (nextStatus: NoteStatus) => {
    if (!nextStatus || nextStatus === value) return;
    const previous = value;
    setValue(nextStatus);
    setMessage("");

    try {
      await updateNoteStatus(noteId, nextStatus);
      revalidator.revalidate();
    } catch {
      setValue(previous);
      setMessage("상태를 저장하지 못했습니다.");
    }
  };

  const changeStatus = (nextStatus: NoteStatus | null) => {
    if (!nextStatus || nextStatus === value) return;
    if (nextStatus === "completed" && openQuestionCount > 0) {
      setCompletionWarningOpen(true);
      return;
    }
    void persistStatus(nextStatus);
  };

  return (
    <div className={styles.root} onClick={(event) => event.stopPropagation()}>
      <Select.Root value={value} onValueChange={changeStatus}>
        <Select.Trigger className={styles.trigger} aria-label="노트 상태 변경">
          <span className={styles.stateMark} data-status={value} aria-hidden="true" />
          <Select.Value>
            {statusOptions.find((option) => option.value === value)?.label}
          </Select.Value>
          <Select.Icon className={styles.icon}>⌄</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className={styles.positioner} sideOffset={5} align="end">
            <Select.Popup className={styles.popup}>
              <Select.List>
                {statusOptions.map((option) => (
                  <Select.Item className={styles.item} key={option.value} value={option.value}>
                    <span className={styles.stateMark} data-status={option.value} aria-hidden="true" />
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className={styles.check}>✓</Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <AlertDialog.Root
        open={completionWarningOpen}
        onOpenChange={setCompletionWarningOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className={styles.backdrop} />
          <AlertDialog.Popup className={styles.dialog}>
            <AlertDialog.Title>열린 질문이 남아 있습니다</AlertDialog.Title>
            <AlertDialog.Description>
              {openQuestionCount}개의 질문은 그대로 남습니다. 지금의 학습 목표를
              정리한 것으로 표시할까요?
            </AlertDialog.Description>
            <div className={styles.dialogActions}>
              <AlertDialog.Close className={styles.cancelButton}>
                취소
              </AlertDialog.Close>
              <AlertDialog.Close
                className={styles.completeButton}
                onClick={() => void persistStatus("completed")}
              >
                완료로 표시
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <span className={styles.message} role="status">{message}</span>
    </div>
  );
};
