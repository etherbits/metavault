import { z } from "zod";

export const refreshCatalogueSchema = z.object({
  refreshWindowMs: z.number().int().min(0).optional(),
});

export const catalogueSourceRefreshSchema = z.object({
  source_type: z.enum(["anilist", "tmdb", "igdb", "openlibrary"]),
  status: z.enum(["completed", "skipped", "failed"]),
  fetched_count: z.number().int(),
  embedded_count: z.number().int(),
  skipped_embedding_count: z.number().int(),
  message: z.string().optional(),
});

export const catalogueRefreshResponseSchema = z.object({
  source_type: z.literal("all"),
  status: z.literal("completed"),
  fetched_count: z.number().int(),
  embedded_count: z.number().int(),
  skipped_embedding_count: z.number().int(),
  sources: z.array(catalogueSourceRefreshSchema),
});

export type RefreshCatalogueInput = z.infer<typeof refreshCatalogueSchema>;
export type CatalogueSourceRefresh = z.infer<
  typeof catalogueSourceRefreshSchema
>;
export type CatalogueRefreshResponse = z.infer<
  typeof catalogueRefreshResponseSchema
>;
