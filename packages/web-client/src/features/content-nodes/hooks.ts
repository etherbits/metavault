import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContentNode,
  deleteContentNode,
  fetchContentNodes,
  updateContentNode,
} from "@/features/content-nodes/api";
import { queryKeys } from "@/shared/api/queryKeys";

export function useContentNodes(libraryEntryId: string | null) {
  return useQuery({
    queryKey: queryKeys.contentNodes.byLibraryEntry(libraryEntryId ?? "none"),
    queryFn: () =>
      libraryEntryId ? fetchContentNodes(libraryEntryId) : Promise.resolve([]),
    enabled: Boolean(libraryEntryId),
  });
}

export function useCreateContentNode(libraryEntryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContentNode,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentNodes.byLibraryEntry(libraryEntryId),
      });
    },
  });
}

export function useUpdateContentNode(libraryEntryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateContentNode,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentNodes.byLibraryEntry(libraryEntryId),
      });
    },
  });
}

export function useDeleteContentNode(libraryEntryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteContentNode,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contentNodes.byLibraryEntry(libraryEntryId),
      });
    },
  });
}
