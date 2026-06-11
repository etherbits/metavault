import type { z } from "zod";
import {
  aiIntegrationProfileSchema,
  aiIntegrationProfilesResponseSchema,
  aiIntegrationSettingsListSchema,
  aiIntegrationSettingsSchema,
  aiIntegrationTypeSchema,
  createAiIntegrationProfileSchema,
  updateAiIntegrationProfileSchema,
  updateAiIntegrationSchema,
} from "../../../../server/ai-integrations/ai-integration.schema";

export {
  aiIntegrationSettingsListSchema,
  aiIntegrationSettingsSchema,
  aiIntegrationProfileSchema,
  aiIntegrationProfilesResponseSchema,
  aiIntegrationTypeSchema,
  createAiIntegrationProfileSchema,
  updateAiIntegrationProfileSchema,
  updateAiIntegrationSchema,
};

export type AiIntegrationType = z.infer<typeof aiIntegrationTypeSchema>;
export type AiIntegrationSettings = z.infer<typeof aiIntegrationSettingsSchema>;
export type UpdateAiIntegrationInput = z.infer<
  typeof updateAiIntegrationSchema
>;
export type AiIntegrationProfile = z.infer<typeof aiIntegrationProfileSchema>;
export type AiIntegrationsResponse = z.infer<
  typeof aiIntegrationProfilesResponseSchema
>;
export type CreateAiIntegrationProfileInput = z.infer<
  typeof createAiIntegrationProfileSchema
>;
export type UpdateAiIntegrationProfileInput = z.infer<
  typeof updateAiIntegrationProfileSchema
>;
