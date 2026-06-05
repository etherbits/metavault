import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteLibraryEntries,
  executeEzqQuery,
  exportLibraryEntries,
  fetchLibraryEntries,
  fetchLibraryEntry,
  importLibraryEntries,
  updateLibraryEntryStatus,
  uploadLibraryEntryImage,
} from "@/features/library/api";
import { mapServerEntriesToMediaItems } from "@/features/library/mappers";
import type { MediaItem } from "@/features/library/types";
import { queryKeys } from "@/shared/api/queryKeys";

export function useLibraryEntries() {
  return useQuery({
    queryKey: queryKeys.library.entries(),
    queryFn: fetchLibraryEntries,
  });
}

export function useLibraryEntry(id: string | null) {
  return useQuery({
    queryKey: queryKeys.library.entry(id ?? "none"),
    queryFn: () => (id ? fetchLibraryEntry(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useUpdateLibraryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLibraryEntryStatus,
    onSuccess: (items) => {
      queryClient.setQueryData(queryKeys.library.entries(), items);
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
  });
}

export function useDeleteLibraryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLibraryEntries,
    onSuccess: (items) => {
      queryClient.setQueryData(queryKeys.library.entries(), items);
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
  });
}

export function useImportLibraryEntries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importLibraryEntries,
    onSuccess: (items) => {
      queryClient.setQueryData(queryKeys.library.entries(), items);
    },
  });
}

export function useUploadLibraryEntryImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadLibraryEntryImage,
    onSuccess: (items) => {
      queryClient.setQueryData(queryKeys.library.entries(), items);
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
  });
}

export function useExportLibraryEntries() {
  return useMutation({
    mutationFn: exportLibraryEntries,
  });
}

export function useEzqSearch(query: string) {
  const queryClient = useQueryClient();

  return useQuery<MediaItem[]>({
    queryKey: queryKeys.library.ezq(query),
    queryFn: async () => {
      const response = await executeEzqQuery({ query });
      const items = mapServerEntriesToMediaItems(response.rows);

      if (isWriteQuery(query)) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.library.entries(),
        });
        queryClient.removeQueries({
          predicate: (cachedQuery) =>
            cachedQuery.queryKey[0] === "library" &&
            cachedQuery.queryKey[1] === "ezq" &&
            cachedQuery.queryKey[2] !== query,
        });
      }

      return items;
    },
    enabled: query.length > 0,
    staleTime: 0,
  });
}

function isWriteQuery(query: string) {
  const action = query.trim().match(/^\/([^\s]+)/)?.[1] ?? "";
  return ["c", "create", "u", "update", "d", "delete"].includes(action);
}
