import { z } from "zod";

const igdbGenreSchema = z.object({
  name: z.string().nullable().optional(),
});

export const igdbGameSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  cover: z
    .object({
      url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  rating: z.number().nullable().optional(),
  rating_count: z.number().nullable().optional(),
  total_rating_count: z.number().nullable().optional(),
  summary: z.string().nullable().optional(),
  first_release_date: z.number().nullable().optional(),
  genres: z.array(igdbGenreSchema).nullable().optional(),
  themes: z.array(igdbGenreSchema).nullable().optional(),
});

// IGDB game fields and nested cover/genre expansion are requested with APIcalypse:
// https://api-docs.igdb.com/#fields
export const igdbGamesResponseSchema = z.array(igdbGameSchema);

export type IgdbGame = z.infer<typeof igdbGameSchema>;

export type IgdbGameWithContext = {
  game: IgdbGame;
  sourceIntegrationId?: string;
};
