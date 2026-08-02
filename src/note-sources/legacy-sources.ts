export type LegacyNoteSource = {
  readonly title: string;
  readonly url: string;
  readonly description: string | null;
};

type LegacySourceExtraction = {
  readonly content: string;
  readonly sources: readonly LegacyNoteSource[];
};

const sourceHeadingPattern =
  /^##[ \t]+(?:sources|references|출처|참고 자료)[ \t]*$/gim;
const sourceLinePattern =
  /^[-*][ \t]+\[([^\]]+)]\((https?:\/\/.+)\)(?:[ \t]+[—–-][ \t]+(.+))?$/i;

const parseSourceLine = (line: string): LegacyNoteSource | null => {
  const match = sourceLinePattern.exec(line.trim());
  if (!match) return null;

  const [, title, url, description] = match;
  if (!title || !url) return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }

  return {
    title: title.trim(),
    url,
    description: description?.trim() || null,
  };
};

export const extractLegacySources = (content: string): LegacySourceExtraction => {
  const matches = [...content.matchAll(sourceHeadingPattern)];
  const heading = matches.at(-1);
  if (!heading || heading.index === undefined) return { content, sources: [] };

  const sourceBody = content.slice(heading.index + heading[0].length).trim();
  if (!sourceBody || /^#{1,6}[ \t]+/m.test(sourceBody)) {
    return { content, sources: [] };
  }

  const lines = sourceBody.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const parsed = lines.map(parseSourceLine);
  if (parsed.length === 0 || parsed.some((source) => source === null)) {
    return { content, sources: [] };
  }

  const seenUrls = new Set<string>();
  const sources = parsed.filter((source): source is LegacyNoteSource => {
    if (!source || seenUrls.has(source.url)) return false;
    seenUrls.add(source.url);
    return true;
  });

  return {
    content: content.slice(0, heading.index).trimEnd(),
    sources,
  };
};
