import { useEffect, useRef, useState } from "react";

import styles from "./NoteSearch.module.css";

type NoteSearchProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
};

export const NoteSearch = ({ value, onChange }: NoteSearchProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!composingRef.current) setDraft(value);
  }, [value]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <label className={styles.search}>
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.25" />
        <path d="m12.4 12.4 3.1 3.1" />
      </svg>
      <span className={styles.visuallyHidden}>노트 검색</span>
      <input
        ref={inputRef}
        type="search"
        value={draft}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          const nextValue = event.currentTarget.value;
          setDraft(nextValue);
          onChange(nextValue);
        }}
        onChange={(event) => {
          const nextValue = event.currentTarget.value;
          setDraft(nextValue);
          if (!composingRef.current) onChange(nextValue);
        }}
        placeholder="노트 검색"
      />
      <kbd>⌘F</kbd>
    </label>
  );
};
