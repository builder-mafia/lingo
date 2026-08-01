import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import styles from "./NoteSearch.module.css";

type NoteSearchProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label?: string;
};

export const NoteSearch = ({
  value,
  onChange,
  label = "노트 검색",
}: NoteSearchProps) => {
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
      <Search aria-hidden="true" />
      <span className={styles.visuallyHidden}>{label}</span>
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
