import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/queryKeys";
import { fetchAiIntegrations, updateAiIntegration } from "./api";
import type { AiIntegrationType, UpdateAiIntegrationInput } from "./contracts";

export function useAiIntegrations() {
  return useQuery({
    queryKey: queryKeys.aiIntegrations.all,
    queryFn: fetchAiIntegrations,
  });
}

export function useUpdateAiIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      body,
    }: {
      type: AiIntegrationType;
      body: UpdateAiIntegrationInput;
    }) => updateAiIntegration(type, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiIntegrations.all,
      });
    },
  });
}
