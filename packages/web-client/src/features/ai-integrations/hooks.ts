import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  activateAiIntegrationProfile,
  createAiIntegrationProfile,
  deleteAiIntegrationProfile,
  fetchAiIntegrations,
  updateAiIntegration,
  updateAiIntegrationProfile,
} from "./api";
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

export function useCreateAiIntegrationProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAiIntegrationProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiIntegrations.all,
      });
    },
  });
}

export function useUpdateAiIntegrationProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAiIntegrationProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiIntegrations.all,
      });
    },
  });
}

export function useActivateAiIntegrationProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateAiIntegrationProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiIntegrations.all,
      });
    },
  });
}

export function useDeleteAiIntegrationProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAiIntegrationProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiIntegrations.all,
      });
    },
  });
}
