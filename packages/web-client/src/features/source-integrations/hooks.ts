import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/queryKeys";
import { fetchSourceIntegrations, updateSourceIntegration } from "./api";
import type {
  SourceIntegrationType,
  UpdateSourceIntegrationInput,
} from "./contracts";

export function useSourceIntegrations() {
  return useQuery({
    queryKey: queryKeys.sourceIntegrations.all,
    queryFn: fetchSourceIntegrations,
  });
}

export function useUpdateSourceIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      body,
    }: {
      type: SourceIntegrationType;
      body: UpdateSourceIntegrationInput;
    }) => updateSourceIntegration(type, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.sourceIntegrations.all,
      });
    },
  });
}
