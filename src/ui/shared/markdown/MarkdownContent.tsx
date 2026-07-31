import { memo, type ComponentPropsWithoutRef } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import styles from "./MarkdownContent.module.css";

type MarkdownContentProps = {
  className?: string;
  compact?: boolean;
  content: string;
};

const allowedElements = [
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
] as const;

const ExternalLink = ({
  children,
  ...props
}: ComponentPropsWithoutRef<"a">) => (
  <a {...props} rel="noopener noreferrer" target="_blank">
    {children}
  </a>
);

const ScrollableTable = ({
  children,
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"table"> & { node?: unknown }) => (
  <div
    aria-label="표"
    className={styles.tableScroller}
    role="region"
    tabIndex={0}
  >
    <table {...props}>{children}</table>
  </div>
);

const components: Components = {
  a: ExternalLink,
  h1: ({ children }) => <h3>{children}</h3>,
  h2: ({ children }) => <h3>{children}</h3>,
  table: ScrollableTable,
};

export const MarkdownContent = memo(function MarkdownContent({
  className,
  compact = false,
  content,
}: MarkdownContentProps) {
  const classes = [
    styles.root,
    compact ? styles.compact : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <Markdown
        allowedElements={[...allowedElements]}
        components={components}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {content}
      </Markdown>
    </div>
  );
});
