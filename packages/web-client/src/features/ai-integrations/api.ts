import { apiRequest } from "@/shared/api/client";
import {
  aiIntegrationProfileSchema,
  aiIntegrationProfilesResponseSchema,
  aiIntegrationSettingsSchema,
  type AiIntegrationType,
  type CreateAiIntegrationProfileInput,
  type UpdateAiIntegrationProfileInput,
  type UpdateAiIntegrationInput,
} from "./contracts";

export function fetchAiIntegrations() {
  return apiRequest("/ai-integrations", aiIntegrationProfilesResponseSchema);
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

export function createAiIntegrationProfile(
  body: CreateAiIntegrationProfileInput
) {
  return apiRequest("/ai-integrations", aiIntegrationProfileSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAiIntegrationProfile({
  id,
  body,
}: {
  id: string;
  body: UpdateAiIntegrationProfileInput;
}) {
  return apiRequest(
    `/ai-integrations/profiles/${id}`,
    aiIntegrationProfileSchema,
    {
      method: "PUT",
      body: JSON.stringify(body),
    }
  );
}

export function activateAiIntegrationProfile(id: string) {
  return apiRequest(
    `/ai-integrations/profiles/${id}/active`,
    aiIntegrationProfileSchema,
    {
      method: "PUT",
    }
  );
}

export function deleteAiIntegrationProfile(id: string) {
  return apiRequest(
    `/ai-integrations/profiles/${id}`,
    aiIntegrationProfileSchema.pick({ id: true }),
    {
      method: "DELETE",
    }
  );
}
