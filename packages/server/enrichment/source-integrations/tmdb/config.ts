import { defineConfig, requiredString } from "../config";

export const tmdbConfig = defineConfig({
  apiKey: {
    schema: requiredString,
    label: "API Key",
    secret: true,
    required: true,
  },
});

export const TMDB_API_BASE_URL =
  Bun.env.METAVAULT_TMDB_API_BASE_URL ?? "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL =
  Bun.env.METAVAULT_TMDB_IMAGE_BASE_URL ?? "https://image.tmdb.org/t/p/w500";
