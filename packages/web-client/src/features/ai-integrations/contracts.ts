import type { z } from "zod";
import {
  aiIntegrationSettingsListSchema,
  aiIntegrationSettingsSchema,
  aiIntegrationTypeSchema,
  updateAiIntegrationSchema,
} from "../../../../server/ai-integrations/ai-integration.schema";

export {
  aiIntegrationSettingsListSchema,
  aiIntegrationSettingsSchema,
  aiIntegrationTypeSchema,
  updateAiIntegrationSchema,
};

export type AiIntegrationType = z.infer<typeof aiIntegrationTypeSchema>;
export type AiIntegrationSettings = z.infer<typeof aiIntegrationSettingsSchema>;
export type UpdateAiIntegrationInput = z.infer<
  typeof updateAiIntegrationSchema
>;
