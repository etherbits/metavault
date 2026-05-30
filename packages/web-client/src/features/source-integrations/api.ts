import { apiRequest } from "@/shared/api/client";
import {
  sourceIntegrationSettingsListSchema,
  sourceIntegrationSettingsSchema,
  type SourceIntegrationType,
  type UpdateSourceIntegrationInput,
} from "./contracts";

export function fetchSourceIntegrations() {
  return apiRequest(
    "/source-integrations",
    sourceIntegrationSettingsListSchema
  );
}

export function updateSourceIntegration(
  type: SourceIntegrationType,
  body: UpdateSourceIntegrationInput
) {
  return apiRequest(
    `/source-integrations/${type}`,
    sourceIntegrationSettingsSchema,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}
