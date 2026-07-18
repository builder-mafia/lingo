import packageMetadata from "../package.json" with { type: "json" };

declare const LINGO_BUILD_VERSION: string | undefined;

export const lingoVersion =
  typeof LINGO_BUILD_VERSION === "string"
    ? LINGO_BUILD_VERSION
    : packageMetadata.version;
