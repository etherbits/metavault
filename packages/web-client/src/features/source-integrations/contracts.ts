import type { z } from "zod";
import {
  sourceIntegrationSettingsListSchema,
  sourceIntegrationSettingsSchema,
  sourceIntegrationTypeSchema,
  updateSourceIntegrationSchema,
} from "../../../../server/source-integrations/source-integration.schema";

export {
  sourceIntegrationSettingsListSchema,
  sourceIntegrationSettingsSchema,
  sourceIntegrationTypeSchema,
  updateSourceIntegrationSchema,
};

export type SourceIntegrationType = z.infer<typeof sourceIntegrationTypeSchema>;
export type SourceIntegrationSettings = z.infer<
  typeof sourceIntegrationSettingsSchema
>;
export type UpdateSourceIntegrationInput = z.infer<
  typeof updateSourceIntegrationSchema
>;
