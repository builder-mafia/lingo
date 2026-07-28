declare const LINGO_STANDALONE: boolean | undefined;

export const isStandaloneBuild =
  typeof LINGO_STANDALONE === "boolean" && LINGO_STANDALONE;
