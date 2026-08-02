import { Collapsible } from "@base-ui/react/collapsible";
import { Tooltip } from "@base-ui/react/tooltip";
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

const sourceOrigin = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
};

const SiteIcon = ({ url }: { readonly url: string }) => {
  const origin = sourceOrigin(url);

  return (
    <span aria-hidden="true" className={styles.siteIconWell}>
      <Globe2 className={styles.siteIconFallback} />
      {origin ? (
        <img
          alt=""
          aria-hidden="true"
          className={styles.siteIconImage}
          decoding="async"
          draggable={false}
          loading="lazy"
          onError={(event) => event.currentTarget.removeAttribute("data-loaded")}
          onLoad={(event) => event.currentTarget.setAttribute("data-loaded", "")}
          src={`/api/site-icon?origin=${encodeURIComponent(origin)}`}
        />
      ) : null}
    </span>
  );
};

const SourceRow = ({ source }: { readonly source: DisplaySource }) => {
  const domain = sourceDomain(source.url);
  const link = (
    <a
      className={styles.sourceRow}
      href={source.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <SiteIcon url={source.url} />
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

  if (!source.description) return link;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={500} render={link} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className={styles.tooltip}>
            {source.description}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

export const NoteSources = ({ sources }: NoteSourcesProps) => {
  if (sources.length === 0) return null;

  const visibleSources = sources.slice(0, initiallyVisibleCount);
  const remainingSources = sources.slice(initiallyVisibleCount);

  return (
    <Tooltip.Provider delay={500}>
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
    </Tooltip.Provider>
  );
};
