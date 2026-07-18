import { join, normalize, sep } from "node:path";

export interface WebAssets {
  readonly hasIndex: () => Promise<boolean>;
  readonly read: (pathname: string) => Promise<Blob | undefined>;
}

const safeAssetPath = (pathname: string) => {
  const relativePath = normalize(pathname.replace(/^\/+/, ""));

  if (
    relativePath === "" ||
    relativePath === "." ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`)
  ) {
    return undefined;
  }

  return relativePath;
};

export const makeDiskWebAssets = (webRootPath: string): WebAssets => ({
  hasIndex: () => Bun.file(join(webRootPath, "index.html")).exists(),
  read: async (pathname) => {
    const relativePath = safeAssetPath(pathname);
    if (relativePath === undefined) return undefined;

    const file = Bun.file(join(webRootPath, relativePath));
    return (await file.exists()) ? file : undefined;
  },
});

export const makeEmbeddedWebAssets = (
  assetPaths: Readonly<Record<string, string>>,
): WebAssets => {
  const assets = new Map(
    Object.entries(assetPaths).map(([pathname, filePath]) => [
      pathname,
      Bun.file(filePath),
    ]),
  );

  return {
    hasIndex: () => Promise.resolve(assets.has("/index.html")),
    read: (pathname) => Promise.resolve(assets.get(pathname)),
  };
};
