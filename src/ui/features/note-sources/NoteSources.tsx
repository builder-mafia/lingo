import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown, ExternalLink } from "lucide-react";

import type { NoteSource } from "../../../schemas/note-source";
import styles from "./NoteSources.module.css";

export type DisplaySource = Pick<
  NoteSource,
  "title" | "url" | "description"
>;

type NoteSourcesProps = {
  readonly sources: readonly DisplaySource[];
};

const initiallyVisibleCount = 3;

const sourceDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "외부 링크";
  }
};

const SourceRow = ({ source }: { readonly source: DisplaySource }) => (
  <a
    aria-label={`새 탭에서 ${source.title} 열기`}
    className={styles.sourceRow}
    href={source.url}
    rel="noopener noreferrer"
    target="_blank"
  >
    <span className={styles.sourceText}>
      <strong>{source.title}</strong>
      <span>{sourceDomain(source.url)}</span>
      {source.description ? <p>{source.description}</p> : null}
    </span>
    <ExternalLink aria-hidden="true" />
  </a>
);

export const NoteSources = ({ sources }: NoteSourcesProps) => {
  if (sources.length === 0) return null;

  const visibleSources = sources.slice(0, initiallyVisibleCount);
  const remainingSources = sources.slice(initiallyVisibleCount);

  return (
    <section className={styles.root} aria-labelledby="note-sources-heading">
      <header className={styles.header}>
        <div className={styles.titleLine}>
          <h3 id="note-sources-heading">출처</h3>
          <span>{sources.length}</span>
        </div>
        <p>이 노트를 정리하며 참고한 문서</p>
      </header>
      <div className={styles.list}>
        {visibleSources.map((source) => (
          <SourceRow source={source} key={source.url} />
        ))}
        {remainingSources.length > 0 ? (
          <Collapsible.Root className={styles.collapsible}>
            <Collapsible.Trigger className={styles.moreButton}>
              <span className={styles.closedLabel}>
                나머지 {remainingSources.length}개 보기
              </span>
              <span className={styles.openLabel}>접기</span>
              <ChevronDown aria-hidden="true" />
            </Collapsible.Trigger>
            <Collapsible.Panel className={styles.panel}>
              {remainingSources.map((source) => (
                <SourceRow source={source} key={source.url} />
              ))}
            </Collapsible.Panel>
          </Collapsible.Root>
        ) : null}
      </div>
    </section>
  );
};
