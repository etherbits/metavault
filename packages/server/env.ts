import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().default(3435),
    CLIENT_ORIGIN: z.string().default("http://localhost:3534"),
    DATABASE_URL: z.string().default("sqlite://./data/db.sqlite"),
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    MEDIA_ROOT: z.string().default("media"),
    METAVAULT_ANILIST_GRAPHQL_ENDPOINT: z
      .string()
      .url()
      .default("https://graphql.anilist.co"),
    METAVAULT_TMDB_API_BASE_URL: z
      .string()
      .url()
      .default("https://api.themoviedb.org/3"),
    METAVAULT_TMDB_IMAGE_BASE_URL: z
      .string()
      .url()
      .default("https://image.tmdb.org/t/p/w500"),
    METAVAULT_IGDB_GAMES_ENDPOINT: z
      .string()
      .url()
      .default("https://api.igdb.com/v4/games"),
    METAVAULT_OPEN_LIBRARY_SEARCH_ENDPOINT: z
      .string()
      .url()
      .default("https://openlibrary.org/search.json"),
    METAVAULT_OPEN_LIBRARY_COVER_BASE_URL: z
      .string()
      .url()
      .default("https://covers.openlibrary.org/b/id"),
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.coerce.number().int().positive().default(587),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;

    for (const key of ["EMAIL_HOST", "EMAIL_USER", "EMAIL_PASS"] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }
  });

export const parsedEnv = envSchema.parse(process.env);
