import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  deleteAliasMapping,
  fetchAliasMappings,
  upsertAliasMapping,
} from "./api";
import type { UpsertAliasMappingInput } from "./contracts";

export function useAliasMappings() {
  return useQuery({
    queryKey: queryKeys.aliases.all,
    queryFn: fetchAliasMappings,
  });
}

export function useUpsertAliasMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertAliasMappingInput) => upsertAliasMapping(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aliases.all });
    },
  });
}

export function useDeleteAliasMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAliasMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aliases.all });
    },
  });
}
