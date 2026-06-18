import { z } from "zod";

export const aliasNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Alias may only contain letters, numbers, underscores, and dashes",
  });

export const aliasMappingSchema = z.object({
  id: z.string(),
  alias: aliasNameSchema,
  expansion: z.string().trim().min(1).max(1000),
});

export const aliasMappingsSchema = aliasMappingSchema.array();

export const upsertAliasMappingSchema = z.object({
  alias: aliasNameSchema,
  expansion: z.string().trim().min(1).max(1000),
});

export const aliasMappingParamsSchema = z.object({
  alias: aliasNameSchema,
});

export type AliasMapping = z.infer<typeof aliasMappingSchema>;
export type UpsertAliasMappingInput = z.infer<typeof upsertAliasMappingSchema>;
