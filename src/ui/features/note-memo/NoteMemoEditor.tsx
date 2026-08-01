import { Button } from "@base-ui/react/button";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { saveNoteMemo } from "../../shared/api/workspace";
import styles from "./NoteMemoEditor.module.css";

const AUTOSAVE_DELAY_MS = 650;
const SAVED_STATUS_DURATION_MS = 1_400;

type SaveStatus = "idle" | "saving" | "saved" | "error";

const statusText: Record<SaveStatus, string> = {
  idle: "",
  saving: "저장 중…",
  saved: "저장됨",
  error: "저장하지 못했습니다.",
};

type NoteMemoEditorProps = {
  readonly noteId: string;
  readonly initialMemo: string;
};

export const NoteMemoEditor = ({
  noteId,
  initialMemo,
}: NoteMemoEditorProps) => {
  const [value, setValue] = useState(initialMemo);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const valueRef = useRef(initialMemo);
  const savedValueRef = useRef(initialMemo);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const clearSavedStatusTimer = useCallback(() => {
    if (savedStatusTimerRef.current !== null) {
      clearTimeout(savedStatusTimerRef.current);
      savedStatusTimerRef.current = null;
    }
  }, []);

  const queueSave = useCallback(
    (nextValue: string) => {
      clearAutosaveTimer();
      clearSavedStatusTimer();
      if (nextValue === savedValueRef.current) {
        setStatus("idle");
        return;
      }

      setStatus("saving");
      const request = saveChainRef.current.then(() =>
        saveNoteMemo(noteId, nextValue),
      );
      saveChainRef.current = request.then(
        () => undefined,
        () => undefined,
      );

      void request.then(
        () => {
          savedValueRef.current = nextValue;
          if (!mountedRef.current || valueRef.current !== nextValue) return;

          setStatus("saved");
          savedStatusTimerRef.current = setTimeout(() => {
            if (mountedRef.current && valueRef.current === savedValueRef.current) {
              setStatus("idle");
            }
          }, SAVED_STATUS_DURATION_MS);
        },
        () => {
          if (mountedRef.current && valueRef.current === nextValue) {
            setStatus("error");
          }
        },
      );
    },
    [clearAutosaveTimer, clearSavedStatusTimer, noteId],
  );

  const flush = useCallback(() => {
    queueSave(valueRef.current);
  }, [queueSave]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearAutosaveTimer();
      clearSavedStatusTimer();
    };
  }, [clearAutosaveTimer, clearSavedStatusTimer]);

  return (
    <>
      <div className={styles.heading}>
        <h2 id="memo-heading">메모</h2>
        <span className={styles.saveStatus} aria-live="polite">
          {statusText[status]}
        </span>
      </div>
      <textarea
        className={styles.editor}
        aria-label="노트 메모"
        value={value}
        placeholder="떠오른 생각을 적어두세요."
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          valueRef.current = nextValue;
          setValue(nextValue);
          setStatus("idle");
          clearAutosaveTimer();
          clearSavedStatusTimer();
          autosaveTimerRef.current = setTimeout(
            () => queueSave(nextValue),
            AUTOSAVE_DELAY_MS,
          );
        }}
        onBlur={flush}
      />
      {status === "error" ? (
        <Button className={styles.retryButton} type="button" onClick={flush}>
          <RefreshCw aria-hidden="true" />
          다시 시도
        </Button>
      ) : null}
    </>
  );
};
