import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRevalidator } from "react-router";

import type { NoteStatus } from "../../../schemas/note-status";
import { updateCourseStatus } from "../../shared/api/workspace";
import styles from "../note-status/NoteStatusSelect.module.css";

const statusOptions: readonly { value: NoteStatus; label: string }[] = [
  { value: "not_started", label: "시작 전" },
  { value: "in_progress", label: "진행 중" },
  { value: "completed", label: "완료" },
  { value: "deferred", label: "나중에 하기" },
];

type CourseStatusSelectProps = {
  readonly courseId: string;
  readonly status: NoteStatus;
  readonly incompleteChapterCount?: number;
};

export const CourseStatusSelect = ({
  courseId,
  status,
  incompleteChapterCount = 0,
}: CourseStatusSelectProps) => {
  const [value, setValue] = useState(status);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [completionWarningOpen, setCompletionWarningOpen] = useState(false);
  const revalidator = useRevalidator();

  useEffect(() => setValue(status), [status]);

  const persistStatus = async (nextStatus: NoteStatus) => {
    if (nextStatus === value || pendingRef.current) return false;
    const previous = value;
    setValue(nextStatus);
    setMessage("");
    pendingRef.current = true;
    setPending(true);
    try {
      await updateCourseStatus(courseId, nextStatus);
      revalidator.revalidate();
      return true;
    } catch {
      setValue(previous);
      setMessage("상태를 저장하지 못했습니다.");
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const changeStatus = (nextStatus: NoteStatus | null) => {
    if (!nextStatus || nextStatus === value) return;
    if (nextStatus === "completed" && incompleteChapterCount > 0) {
      setCompletionWarningOpen(true);
      return;
    }
    void persistStatus(nextStatus);
  };

  return (
    <div className={styles.root} onClick={(event) => event.stopPropagation()}>
      <Select.Root value={value} onValueChange={changeStatus}>
        <Select.Trigger className={styles.trigger} aria-label="코스 상태 변경" disabled={pending}>
          <span className={styles.stateMark} data-status={value} aria-hidden="true" />
          <Select.Value>{statusOptions.find((option) => option.value === value)?.label}</Select.Value>
          <Select.Icon className={styles.icon}><ChevronDown aria-hidden="true" /></Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className={styles.positioner} sideOffset={5} align="end">
            <Select.Popup className={styles.popup}>
              <Select.List>
                {statusOptions.map((option) => (
                  <Select.Item className={styles.item} key={option.value} value={option.value}>
                    <span className={styles.stateMark} data-status={option.value} aria-hidden="true" />
                    <Select.ItemText>{option.label}</Select.ItemText>
                    <Select.ItemIndicator className={styles.check}><Check aria-hidden="true" /></Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
      <AlertDialog.Root open={completionWarningOpen} onOpenChange={setCompletionWarningOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className={styles.backdrop} />
          <AlertDialog.Popup className={styles.dialog}>
            <AlertDialog.Title>아직 끝내지 않은 장이 있습니다</AlertDialog.Title>
            <AlertDialog.Description>
              {incompleteChapterCount}개의 장은 그대로 남습니다. 지금의 학습 목표를 정리한 것으로 표시할까요?
            </AlertDialog.Description>
            <div className={styles.dialogActions}>
              <AlertDialog.Close className={styles.cancelButton} disabled={pending}>취소</AlertDialog.Close>
              <button
                className={styles.completeButton}
                disabled={pending}
                onClick={() => {
                  void persistStatus("completed").then((saved) => {
                    if (saved) setCompletionWarningOpen(false);
                  });
                }}
              >
                {pending ? "저장 중…" : "완료로 표시"}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      {message ? <span className={styles.message} role="alert">{message}</span> : null}
    </div>
  );
};
