import { z } from "zod";
import { EntryMediaTypeSchema } from "../db/schema/libraryEntries";

export const recommendationSourceTypeSchema = z.enum(["anilist"]);
export const recommendationAdultFilterSchema = z.enum([
  "exclude",
  "include",
  "only",
]);

export const recommendationFiltersSchema = z
  .object({
    excludedMediaTypes: z.array(EntryMediaTypeSchema).max(20).optional(),
    adult: recommendationAdultFilterSchema.default("exclude"),
    releaseYearFrom: z.number().int().min(1800).max(3000).optional(),
    releaseYearTo: z.number().int().min(1800).max(3000).optional(),
    minPublicRating: z.number().min(0).max(10).optional(),
    excludeExistingLibrary: z.boolean().default(true),
  })
  .refine(
    (filters) =>
      filters.releaseYearFrom === undefined ||
      filters.releaseYearTo === undefined ||
      filters.releaseYearFrom <= filters.releaseYearTo,
    {
      message: "releaseYearFrom must be before or equal to releaseYearTo",
      path: ["releaseYearFrom"],
    }
  )
  .default({ adult: "exclude", excludeExistingLibrary: true });

export const generateRecommendationsSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  count: z.number().int().min(1).max(50).default(10),
  debug: z.boolean().default(false),
  filters: recommendationFiltersSchema,
});

export const recommendationItemSchema = z.object({
  catalogue_entry_id: z.string(),
  source_type: recommendationSourceTypeSchema,
  source_media_id: z.string(),
  title: z.string(),
  media_type: EntryMediaTypeSchema,
  adult: z.boolean(),
  public_rating: z.number().nullable(),
  released_at: z.string().nullable(),
  image_src: z.string().nullable(),
  tags: z.array(z.string()),
  cosine_score: z.number(),
  debug: z
    .object({
      embedding_text_hash: z.string(),
      embedding_model: z.string(),
    })
    .optional(),
});

export const generateRecommendationsResponseSchema = z.object({
  items: z.array(recommendationItemSchema),
});

export type RecommendationSourceType = z.infer<
  typeof recommendationSourceTypeSchema
>;
export type GenerateRecommendationsInput = z.infer<
  typeof generateRecommendationsSchema
>;
export type GenerateRecommendationsResponse = z.infer<
  typeof generateRecommendationsResponseSchema
>;
