import { z } from "zod";

export const tmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string().nullable(),
  original_title: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  popularity: z.number().nullable().optional(),
  overview: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  adult: z.boolean().nullable().optional(),
  genre_ids: z.array(z.number()).nullable().optional(),
});

export const tmdbTvSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  original_name: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
  vote_average: z.number().nullable().optional(),
  popularity: z.number().nullable().optional(),
  overview: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  adult: z.boolean().nullable().optional(),
  genre_ids: z.array(z.number()).nullable().optional(),
});

// TMDB search response fields used for mapping:
// https://developer.themoviedb.org/reference/search-movie
// https://developer.themoviedb.org/reference/search-tv
export const tmdbSearchResponseSchema = z.object({
  results: z.array(z.union([tmdbMovieSchema, tmdbTvSchema])).optional(),
});

export const tmdbGenreListResponseSchema = z.object({
  genres: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
      })
    )
    .optional(),
});

export type TmdbMedia =
  | z.infer<typeof tmdbMovieSchema>
  | z.infer<typeof tmdbTvSchema>;

export type TmdbGenreListResponse = z.infer<typeof tmdbGenreListResponseSchema>;

export type TmdbMediaWithContext = {
  media: TmdbMedia;
  mediaType: "movie" | "tv";
  genreNamesById: Map<number, string>;
  sourceIntegrationId?: string;
};
