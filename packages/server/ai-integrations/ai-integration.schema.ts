import { z } from "zod";
import { requiredString } from "../enrichment/source-integrations/config";

export const aiIntegrationTypeSchema = z.enum(["openai_compatible"]);

export const aiIntegrationParamsSchema = z.object({
  type: aiIntegrationTypeSchema,
});

export const openAiCompatibleConfigSchema = z
  .object({
    baseUrl: z.string().trim().url().default("https://api.openai.com/v1"),
    apiKey: requiredString,
    model: requiredString,
  })
  .catchall(z.unknown());

export const aiIntegrationConfigInputSchema = z.union([
  openAiCompatibleConfigSchema,
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
    config: aiIntegrationConfigInputSchema,
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

export type AiIntegrationType = z.infer<typeof aiIntegrationTypeSchema>;
export type UpdateAiIntegrationInput = z.infer<
  typeof updateAiIntegrationSchema
>;
export type AiIntegrationSettings = z.infer<typeof aiIntegrationSettingsSchema>;
export type OpenAiCompatibleConfig = z.infer<
  typeof openAiCompatibleConfigSchema
>;
