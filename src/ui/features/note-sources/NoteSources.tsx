import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown, ExternalLink, Globe2 } from "lucide-react";

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

const SourceRow = ({ source }: { readonly source: DisplaySource }) => {
  const domain = sourceDomain(source.url);

  return (
    <a
      className={styles.sourceRow}
      href={source.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Globe2 aria-hidden="true" className={styles.siteIcon} />
      <span className={styles.sourceTitle}>{source.title}</span>
      <span aria-hidden="true" className={styles.sourceDomain}>
        {domain}
      </span>
      <ExternalLink aria-hidden="true" className={styles.externalIcon} />
      <span className={styles.visuallyHidden}>
        {domain}, 새 탭으로 열기
      </span>
    </a>
  );
};

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
      </header>
      <Collapsible.Root className={styles.collapsible}>
        <div className={styles.list}>
          {visibleSources.map((source) => (
            <SourceRow source={source} key={source.url} />
          ))}
          {remainingSources.length > 0 ? (
            <>
              <Collapsible.Trigger className={styles.moreButton}>
                <span className={styles.closedLabel}>
                  <span aria-hidden="true">+{remainingSources.length}</span>
                  <span className={styles.visuallyHidden}>
                    나머지 출처 {remainingSources.length}개 보기
                  </span>
                </span>
                <span className={styles.openLabel}>접기</span>
                <ChevronDown aria-hidden="true" />
              </Collapsible.Trigger>
              <Collapsible.Panel className={styles.panel}>
                {remainingSources.map((source) => (
                  <SourceRow source={source} key={source.url} />
                ))}
              </Collapsible.Panel>
            </>
          ) : null}
        </div>
      </Collapsible.Root>
    </section>
  );
};
