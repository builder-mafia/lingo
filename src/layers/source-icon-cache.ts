import { isIP } from "node:net";
import { Context, Effect, Layer } from "effect";

import { Database } from "./database";

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const negativeCacheDurationMs = 24 * 60 * 60 * 1_000;

type FetchSiteIcon = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export type SourceIconCacheConfig = {
  readonly fetch: FetchSiteIcon;
  readonly maxBytes?: number;
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

const canonicalOrigin = (value: string) => {
  try {
    const origin = new URL(value).origin;
    return isSafePublicOrigin(origin) ? origin : undefined;
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

const hasImageSignature = (mimeType: string, data: Uint8Array) => {
  if (mimeType === "image/png") {
    return data.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every(
        (byte, index) => data[index] === byte,
      );
  }
  if (mimeType === "image/jpeg") {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return (
      new TextDecoder().decode(data.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(data.slice(8, 12)) === "WEBP"
    );
  }
  return (
    data.length >= 4 &&
    data[0] === 0 &&
    data[1] === 0 &&
    (data[2] === 1 || data[2] === 2) &&
    data[3] === 0
  );
};

const readIcon = async (
  origin: string,
  config: Required<Pick<SourceIconCacheConfig, "maxBytes" | "timeoutMs">> &
    Pick<SourceIconCacheConfig, "fetch">,
) => {
  let target = `${origin}/favicon.ico`;
  const signal = AbortSignal.timeout(config.timeoutMs);

  for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
    const response = await config.fetch(target, {
      headers: { Accept: "image/png,image/jpeg,image/webp,image/x-icon" },
      redirect: "manual",
      signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 2) return undefined;
      const redirectedUrl = new URL(location, target);
      if (!isSafePublicOrigin(redirectedUrl.origin)) return undefined;
      target = redirectedUrl.href;
      continue;
    }

    if (!response.ok) return undefined;
    const mimeType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (!mimeType || !allowedMimeTypes.has(mimeType)) return undefined;

    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > config.maxBytes) {
      return undefined;
    }
    const data = await readLimitedBody(response, config.maxBytes);
    if (!data || !hasImageSignature(mimeType, data)) return undefined;
    return { mimeType, data };
  }

  return undefined;
};

export const makeSourceIconCacheLayer = (config: SourceIconCacheConfig) =>
  Layer.effect(
    SourceIconCache,
    Effect.gen(function* () {
      const database = yield* Database;
      const resolvedConfig = {
        fetch: config.fetch,
        maxBytes: config.maxBytes ?? 256 * 1_024,
        timeoutMs: config.timeoutMs ?? 1_500,
      };

      const cacheUrl = (url: string) =>
        Effect.gen(function* () {
          const origin = canonicalOrigin(url);
          if (!origin) return;

          const current = yield* database.findSiteIconCache(origin).pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
          );
          if (current && isFresh(current.checkedAt, current.data !== null)) return;

          const icon = yield* Effect.tryPromise({
            try: () => readIcon(origin, resolvedConfig),
            catch: () => undefined,
          }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

          yield* database
            .storeSiteIconCache({
              origin,
              mimeType: icon?.mimeType ?? null,
              data: icon?.data ?? null,
              checkedAt: new Date().toISOString(),
            })
            .pipe(Effect.catchAll(() => Effect.void));
        });

      return {
        cacheUrl,
        cacheMissing: () =>
          database.listSourceOrigins().pipe(
            Effect.catchAll(() => Effect.succeed([])),
            Effect.flatMap((origins) =>
              Effect.forEach(origins, cacheUrl, {
                concurrency: 3,
                discard: true,
              }),
            ),
          ),
      } satisfies SourceIconCacheService;
    }),
  );
