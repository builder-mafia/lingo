import { Button } from "@base-ui/react/button";
import { useState } from "react";

import { ArrowIcon } from "./ArrowIcon";
import styles from "./CopyNoteCommand.module.css";

const NOTE_COMMAND =
  "lingo note create --data '{\"title\":\"새로 배운 주제\",\"labels\":[\"Learning\"]}'";

type CopyState = "idle" | "copied" | "failed";

export const CopyNoteCommand = () => {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const copyNoteCommand = async () => {
    try {
      await navigator.clipboard.writeText(NOTE_COMMAND);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const copyLabel =
    copyState === "copied" ? "명령을 복사했어요" : "노트 만들기 명령 복사";

  return (
    <div className={styles.commandArea}>
      <div className={styles.commandLabel}>
        <span>Terminal</span>
        <span>CLI</span>
      </div>
      <code className={styles.command}>{NOTE_COMMAND}</code>
      <Button className={styles.commandButton} onClick={copyNoteCommand}>
        {copyLabel}
        <ArrowIcon />
      </Button>
      <p className={styles.copyStatus} aria-live="polite">
        {copyState === "failed"
          ? "브라우저에서 복사하지 못했어요. 위 명령을 직접 복사해 주세요."
          : "명령을 실행하면 이 브라우저에서 이어서 생각할 수 있어요."}
      </p>
    </div>
  );
};
