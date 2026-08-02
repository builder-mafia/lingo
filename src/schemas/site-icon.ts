import { z } from "zod";

export const siteIconOriginSchema = z
  .string()
  .superRefine((value, context) => {
    try {
      const url = new URL(value);
      if (
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        url.username !== "" ||
        url.password !== "" ||
        url.pathname !== "/" ||
        url.search !== "" ||
        url.hash !== ""
      ) {
        context.addIssue({
          code: "custom",
          message: "Site icon origin must be an HTTP or HTTPS origin.",
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "Site icon origin must be a valid URL.",
      });
    }
  });

export const siteIconCacheEntrySchema = z.object({
  origin: siteIconOriginSchema,
  mimeType: z.string().nullable(),
  data: z.instanceof(Uint8Array).nullable(),
  checkedAt: z.string().datetime(),
}).refine(
  (entry) =>
    (entry.mimeType === null && entry.data === null) ||
    (entry.mimeType !== null && entry.data !== null),
  "Site icon data and MIME type must both be present or absent.",
);

export type SiteIconCacheEntry = z.infer<typeof siteIconCacheEntrySchema>;
