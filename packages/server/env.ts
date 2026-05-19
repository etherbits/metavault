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
    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    MEDIA_ROOT: z.string().default("media"),
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
