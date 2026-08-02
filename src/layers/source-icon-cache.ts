import { isIP } from "node:net";
import { Context, Effect, Layer } from "effect";

import { Database } from "./database";

const allowedMimeTypes = new Set([
  "image/avif",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const negativeCacheDurationMs = 24 * 60 * 60 * 1_000;
const maximumRedirects = 2;

type FetchSiteIcon = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export type SourceIconCacheConfig = {
  readonly fetch: FetchSiteIcon;
  readonly maxBytes?: number;
  readonly maxHtmlBytes?: number;
  readonly timeoutMs?: number;
};

export interface SourceIconCacheService {
  readonly cacheUrl: (url: string) => Effect.Effect<void>;
  readonly cacheMissing: () => Effect.Effect<void>;
}

export class SourceIconCache extends Context.Tag("@lingo/SourceIconCache")<
  SourceIconCache,
  SourceIconCacheService
>() {}

const isSafePublicOrigin = (origin: string) => {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      isIP(hostname) === 0 &&
      hostname !== "localhost" &&
      !hostname.endsWith(".localhost") &&
      !hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
};

const safePublicUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (!isSafePublicOrigin(url.origin)) return undefined;
    url.hash = "";
    return url;
  } catch {
    return undefined;
  }
};

const isFresh = (checkedAt: string, hasIcon: boolean) =>
  hasIcon || Date.now() - Date.parse(checkedAt) < negativeCacheDurationMs;

const readLimitedBody = async (response: Response, maxBytes: number) => {
  if (!response.body) return undefined;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }

  if (totalBytes === 0) return undefined;
  const data = new Uint8Array(totalBytes);
  let offset = 0;
  chunks.forEach((chunk) => {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return data;
};

const textPrefix = (data: Uint8Array, start: number, end: number) =>
  new TextDecoder().decode(data.slice(start, end));

const hasImageSignature = (mimeType: string, data: Uint8Array) => {
  if (mimeType === "image/png") {
    return (
      data.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every(
        (byte, index) => data[index] === byte,
      )
    );
  }
  if (mimeType === "image/jpeg") {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return (
      textPrefix(data, 0, 4) === "RIFF" &&
      textPrefix(data, 8, 12) === "WEBP"
    );
  }
  if (mimeType === "image/avif") {
    return data.length >= 12 && textPrefix(data, 4, 12) === "ftypavif";
  }
  return (
    data.length >= 4 &&
    data[0] === 0 &&
    data[1] === 0 &&
    (data[2] === 1 || data[2] === 2) &&
    data[3] === 0
  );
};

type ResolvedConfig = Required<
  Pick<SourceIconCacheConfig, "maxBytes" | "maxHtmlBytes" | "timeoutMs">
> &
  Pick<SourceIconCacheConfig, "fetch">;

const fetchPublicResource = async (
  initialUrl: string,
  init: RequestInit,
  config: ResolvedConfig,
  signal: AbortSignal,
  acceptErrorDocument = false,
) => {
  let target = safePublicUrl(initialUrl);
  if (!target) return undefined;

  for (
    let redirectCount = 0;
    redirectCount <= maximumRedirects;
    redirectCount += 1
  ) {
    const response = await config.fetch(target.href, {
      ...init,
      credentials: "omit",
      redirect: "manual",
      referrerPolicy: "no-referrer",
      signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === maximumRedirects) return undefined;
      target = safePublicUrl(new URL(location, target).href);
      if (!target) return undefined;
      continue;
    }

    return response.ok || acceptErrorDocument
      ? { response, url: target }
      : undefined;
  }

  return undefined;
};

const readImage = async (
  url: string,
  config: ResolvedConfig,
  signal: AbortSignal,
) => {
  const resource = await fetchPublicResource(
    url,
    {
      headers: {
        Accept: "image/avif,image/png,image/jpeg,image/webp,image/x-icon",
      },
    },
    config,
    signal,
  );
  if (!resource) return undefined;

  const mimeType = resource.response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (!mimeType || !allowedMimeTypes.has(mimeType)) return undefined;

  const declaredSize = Number(resource.response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > config.maxBytes) {
    return undefined;
  }
  const data = await readLimitedBody(resource.response, config.maxBytes);
  if (!data || !hasImageSignature(mimeType, data)) return undefined;
  return { mimeType, data };
};

const parseAttributes = (tag: string) => {
  const attributes = new Map<string, string>();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(pattern)) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    if (name) {
      attributes.set(
        name.toLowerCase(),
        doubleQuoted ?? singleQuoted ?? unquoted ?? "",
      );
    }
  }
  return attributes;
};

const findDeclaredIcons = (html: string, pageUrl: URL) => {
  const candidates = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => parseAttributes(tag))
    .filter((attributes) => {
      const rel = attributes.get("rel")?.toLowerCase().split(/\s+/) ?? [];
      return (
        (rel.includes("icon") ||
          rel.some((value) => value.startsWith("apple-touch-icon"))) &&
        attributes.get("type")?.toLowerCase() !== "image/svg+xml"
      );
    })
    .map((attributes) => attributes.get("href"))
    .filter((href): href is string => Boolean(href));

  return candidates.flatMap((href) => {
    try {
      const iconUrl = new URL(href, pageUrl);
      return safePublicUrl(iconUrl.href) ? [iconUrl.href] : [];
    } catch {
      return [];
    }
  });
};

const readDeclaredIconUrls = async (
  pageUrl: URL,
  config: ResolvedConfig,
  signal: AbortSignal,
) => {
  const resource = await fetchPublicResource(
    pageUrl.href,
    { headers: { Accept: "text/html,application/xhtml+xml" } },
    config,
    signal,
    true,
  );
  if (!resource) return undefined;

  const contentType = resource.response.headers
    .get("content-type")
    ?.toLowerCase();
  if (
    !contentType?.startsWith("text/html") &&
    !contentType?.startsWith("application/xhtml+xml")
  ) {
    return undefined;
  }
  const declaredSize = Number(resource.response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > config.maxHtmlBytes) {
    return undefined;
  }
  const body = await readLimitedBody(resource.response, config.maxHtmlBytes);
  if (!body) return undefined;
  return findDeclaredIcons(new TextDecoder().decode(body), resource.url);
};

const readIcon = async (pageUrl: URL, config: ResolvedConfig) => {
  const signal = AbortSignal.timeout(config.timeoutMs);
  const declaredIconUrls = await readDeclaredIconUrls(pageUrl, config, signal);
  for (const declaredIconUrl of declaredIconUrls ?? []) {
    const declaredIcon = await readImage(declaredIconUrl, config, signal);
    if (declaredIcon) return declaredIcon;
  }
  return readImage(`${pageUrl.origin}/favicon.ico`, config, signal);
};

export const makeSourceIconCacheLayer = (config: SourceIconCacheConfig) =>
  Layer.effect(
    SourceIconCache,
    Effect.gen(function* () {
      const database = yield* Database;
      const resolvedConfig = {
        fetch: config.fetch,
        maxBytes: config.maxBytes ?? 256 * 1_024,
        maxHtmlBytes: config.maxHtmlBytes ?? 512 * 1_024,
        timeoutMs: config.timeoutMs ?? 2_500,
      };

      const cacheUrl = (url: string) =>
        Effect.gen(function* () {
          const pageUrl = safePublicUrl(url);
          if (!pageUrl) return;

          const current = yield* database.findSiteIconCache(pageUrl.origin).pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          );
          if (current && isFresh(current.checkedAt, current.data !== null)) return;

          const icon = yield* Effect.tryPromise({
            try: () => readIcon(pageUrl, resolvedConfig),
            catch: () => undefined,
          }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

          yield* database
            .storeSiteIconCache({
              origin: pageUrl.origin,
              mimeType: icon?.mimeType ?? null,
              data: icon?.data ?? null,
              checkedAt: new Date().toISOString(),
            })
            .pipe(Effect.catchAll(() => Effect.void));
        });

      return {
        cacheUrl,
        cacheMissing: () =>
          database.listSourceUrls().pipe(
            Effect.catchAll(() => Effect.succeed([])),
            Effect.flatMap((urls) =>
              Effect.forEach(urls, cacheUrl, {
                concurrency: 3,
                discard: true,
              }),
            ),
          ),
      } satisfies SourceIconCacheService;
    }),
  );
