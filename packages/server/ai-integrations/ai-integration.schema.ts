import { z } from "zod";
import { requiredString } from "../enrichment/source-integrations/config";

export const aiIntegrationTypeSchema = z.enum(["openai_compatible"]);

export const aiIntegrationParamsSchema = z.object({
  type: aiIntegrationTypeSchema,
});

export const aiIntegrationIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const openAiCompatibleConfigSchema = z
  .object({
    baseUrl: z.string().trim().url().default("https://api.openai.com/v1"),
    apiKey: requiredString,
    model: requiredString,
  })
  .catchall(z.unknown());

export const openAiCompatibleDraftConfigSchema = z
  .object({
    baseUrl: z.string().trim().url().default("https://api.openai.com/v1"),
    apiKey: z.string().default(""),
    model: z.string().trim().default("gpt-4o-mini"),
  })
  .catchall(z.unknown());

export const aiIntegrationConfigInputSchema = z.union([
  openAiCompatibleConfigSchema,
]);

export const aiIntegrationDraftConfigInputSchema = z.union([
  openAiCompatibleDraftConfigSchema,
]);

export const updateAiIntegrationSchema = z.discriminatedUnion("is_active", [
  z.object({
    is_active: z.literal(true),
    config: aiIntegrationConfigInputSchema,
  }),
  z.object({
    is_active: z.literal(false),
    config: z.undefined().optional(),
  }),
]);

export const aiIntegrationConfigFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  secret: z.boolean(),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  placeholder: z.string().optional(),
});

export const aiIntegrationSettingsSchema = z.discriminatedUnion("is_active", [
  z.object({
    integration_type: aiIntegrationTypeSchema,
    is_active: z.literal(true),
    config: aiIntegrationDraftConfigInputSchema,
    config_fields: z.array(aiIntegrationConfigFieldSchema),
  }),
  z.object({
    integration_type: aiIntegrationTypeSchema,
    is_active: z.literal(false),
    config: z.undefined().optional(),
    config_fields: z.array(aiIntegrationConfigFieldSchema),
  }),
]);

export const aiIntegrationSettingsListSchema =
  aiIntegrationSettingsSchema.array();

export const aiIntegrationProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  integration_type: aiIntegrationTypeSchema,
  is_active: z.boolean(),
  config: aiIntegrationDraftConfigInputSchema,
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export const aiIntegrationProfilesResponseSchema = z.object({
  config_fields: z.array(aiIntegrationConfigFieldSchema),
  integrations: z.array(aiIntegrationProfileSchema),
});

export const createAiIntegrationProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  integration_type: aiIntegrationTypeSchema.default("openai_compatible"),
  config: aiIntegrationDraftConfigInputSchema,
});

export const updateAiIntegrationProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  config: aiIntegrationDraftConfigInputSchema,
});

export type AiIntegrationType = z.infer<typeof aiIntegrationTypeSchema>;
export type UpdateAiIntegrationInput = z.infer<
  typeof updateAiIntegrationSchema
>;
export type AiIntegrationSettings = z.infer<typeof aiIntegrationSettingsSchema>;
export type OpenAiCompatibleConfig = z.infer<
  typeof openAiCompatibleConfigSchema
>;
export type AiIntegrationProfile = z.infer<typeof aiIntegrationProfileSchema>;
export type CreateAiIntegrationProfileInput = z.infer<
  typeof createAiIntegrationProfileSchema
>;
export type UpdateAiIntegrationProfileInput = z.infer<
  typeof updateAiIntegrationProfileSchema
>;
