import { z } from "zod";

export const anilistMediaTypeSchema = z.enum(["ANIME", "MANGA"]);
export type AniListMediaType = z.infer<typeof anilistMediaTypeSchema>;

export const anilistMediaSchema = z.object({
  id: z.number(),
  title: z
    .object({
      english: z.string().nullable().optional(),
      romaji: z.string().nullable().optional(),
      userPreferred: z.string().nullable().optional(),
      native: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  type: anilistMediaTypeSchema,
  startDate: z
    .object({
      year: z.number().nullable().optional(),
      month: z.number().nullable().optional(),
      day: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  coverImage: z
    .object({
      extraLarge: z.string().nullable().optional(),
      large: z.string().nullable().optional(),
      medium: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  averageScore: z.number().nullable().optional(),
  popularity: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  isAdult: z.boolean().nullable().optional(),
  genres: z.array(z.string()).nullable().optional(),
  tags: z
    .array(
      z.object({
        name: z.string().nullable().optional(),
      })
    )
    .nullable()
    .optional(),
});

export type AniListMedia = z.infer<typeof anilistMediaSchema>;

export const anilistResponseSchema = z.object({
  data: z
    .object({
      Media: anilistMediaSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  errors: z.array(z.unknown()).optional(),
});

export type AniListMediaWithContext = {
  media: AniListMedia;
  sourceIntegrationId?: string;
};

export const anilistPopularMediaResponseSchema = z.object({
  data: z
    .object({
      Page: z
        .object({
          media: z.array(anilistMediaSchema).nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  errors: z.array(z.unknown()).optional(),
});
