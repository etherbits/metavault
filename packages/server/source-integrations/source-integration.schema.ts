import { z } from "zod";

export const sourceIntegrationTypeSchema = z.enum([
  "anilist",
  "tmdb",
  "igdb",
  "openlibrary",
]);

export const sourceIntegrationParamsSchema = z.object({
  type: sourceIntegrationTypeSchema,
});

export const sourceIntegrationConfigInputSchema = z
  .record(z.string(), z.unknown())
  .default({});

export const updateSourceIntegrationSchema = z.object({
  is_active: z.boolean(),
  config: sourceIntegrationConfigInputSchema.optional().default({}),
});

export const sourceIntegrationSettingsSchema = z.object({
  integration_type: sourceIntegrationTypeSchema,
  is_active: z.boolean(),
  config: z.record(z.string(), z.unknown()),
  config_fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      secret: z.boolean(),
      required: z.boolean(),
      defaultValue: z.string().optional(),
      placeholder: z.string().optional(),
    })
  ),
});

export const sourceIntegrationSettingsListSchema =
  sourceIntegrationSettingsSchema.array();

export type SourceIntegrationType = z.infer<typeof sourceIntegrationTypeSchema>;
export type UpdateSourceIntegrationInput = z.infer<
  typeof updateSourceIntegrationSchema
>;
export type SourceIntegrationSettings = z.infer<
  typeof sourceIntegrationSettingsSchema
>;
