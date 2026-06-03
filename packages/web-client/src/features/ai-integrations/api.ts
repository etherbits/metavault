import { apiRequest } from "@/shared/api/client";
import {
  aiIntegrationSettingsListSchema,
  aiIntegrationSettingsSchema,
  type AiIntegrationType,
  type UpdateAiIntegrationInput,
} from "./contracts";

export function fetchAiIntegrations() {
  return apiRequest("/ai-integrations", aiIntegrationSettingsListSchema);
}

export function updateAiIntegration(
  type: AiIntegrationType,
  body: UpdateAiIntegrationInput
) {
  return apiRequest(`/ai-integrations/${type}`, aiIntegrationSettingsSchema, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
