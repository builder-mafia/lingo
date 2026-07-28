import { z } from "zod";

export const releaseAssetSchema = z.object({
  name: z.string().min(1),
  browser_download_url: z.string().url(),
});

export const latestReleaseSchema = z.object({
  tag_name: z.string().min(1),
  draft: z.boolean(),
  prerelease: z.boolean(),
  assets: z.array(releaseAssetSchema),
});

export const cliVersionResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ version: z.string().min(1) }),
});

export const selfUpdateResultSchema = z.discriminatedUnion("updated", [
  z.object({
    updated: z.literal(true),
    previousVersion: z.string().min(1),
    version: z.string().min(1),
  }),
  z.object({
    updated: z.literal(false),
    version: z.string().min(1),
  }),
]);

export type SelfUpdateResult = z.infer<typeof selfUpdateResultSchema>;
