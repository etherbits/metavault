import { z } from "zod";

export const refreshCatalogueSchema = z.object({
  refreshWindowMs: z.number().int().min(0).optional(),
});

export const catalogueRefreshResponseSchema = z.object({
  source_type: z.literal("anilist"),
  status: z.literal("completed"),
  fetched_count: z.number().int(),
  embedded_count: z.number().int(),
  skipped_embedding_count: z.number().int(),
});

export type RefreshCatalogueInput = z.infer<typeof refreshCatalogueSchema>;
export type CatalogueRefreshResponse = z.infer<
  typeof catalogueRefreshResponseSchema
>;
