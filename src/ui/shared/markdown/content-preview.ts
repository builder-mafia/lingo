const fencedCodeBlock = /```[\s\S]*?```/g;
const image = /!\[([^\]]*)\]\([^)]*\)/g;
const link = /\[([^\]]+)\]\([^)]*\)/g;
const htmlTag = /<[^>]*>/g;

export const toContentPreview = (markdown: string) =>
  markdown
    .replace(fencedCodeBlock, " ")
    .replace(image, "$1")
    .replace(link, "$1")
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^#{1,6}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^[-+*]\s+(?:\[[ xX]\]\s+)?/, "")
        .replace(/^\d+[.)]\s+/, "")
        .replace(htmlTag, "")
        .replace(/\*\*|__|~~|`/g, "")
        .replace(/(?<!\w)[*_]|[*_](?!\w)/g, ""),
    )
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
