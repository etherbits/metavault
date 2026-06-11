import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiRequest } from "@/shared/api/client";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  collectionEntryResponseSchema,
  collectionResponseSchema,
  collectionWithEntriesResponseSchema,
  createCollectionSchema,
  updateCollectionSchema,
} from "../../../../server/collection/collection.schema";

export interface CollectionView {
  id: string;
  name: string;
  entries: { library_entry_id: string }[];
}

const collectionsResponseSchema = collectionWithEntriesResponseSchema.array();

export function useCollections(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.collections.all,
    queryFn: fetchCollections,
    enabled: options.enabled ?? true,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      ids = [],
    }: {
      name: string;
      ids?: string[];
    }) => {
      const body = createCollectionSchema.parse({
        name,
        entries: ids.map((id) => ({ library_entry_id: id })),
      });

      await apiRequest("/collections", collectionResponseSchema, {
        method: "POST",
        body: JSON.stringify(body),
      });

      return fetchCollections();
    },
    onSuccess: (collections) => {
      queryClient.setQueryData(queryKeys.collections.all, collections);
    },
  });
}

export function useAddToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      collectionId,
      collections,
    }: {
      ids: string[];
      collectionId: string;
      collections: CollectionView[];
    }) => {
      const collection = collections.find((item) => item.id === collectionId);
      if (!collection) {
        throw new Error("Collection not found");
      }

      const entries = mergeCollectionEntryIds(collection.entries, ids);
      const body = updateCollectionSchema.parse({ entries });

      await apiRequest(
        `/collections/${collectionId}`,
        collectionResponseSchema,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        }
      );

      return fetchCollections();
    },
    onSuccess: (collections) => {
      queryClient.setQueryData(queryKeys.collections.all, collections);
    },
  });
}

async function fetchCollections() {
  const rows = await apiRequest("/collections", collectionsResponseSchema);
  return mapCollectionRows(rows);
}

function mapCollectionRows(
  rows: z.infer<typeof collectionsResponseSchema>
): CollectionView[] {
  return rows.map((collection) => ({
    id: collection.id,
    name: collection.name,
    entries: parseCollectionEntries(collection.entries).map((entry) => ({
      library_entry_id: entry.library_entry_id,
    })),
  }));
}

function parseCollectionEntries(entries: string) {
  const raw = JSON.parse(entries) as unknown;
  const rows = Array.isArray(raw) ? raw.filter(Boolean) : raw;
  return collectionEntryResponseSchema.array().parse(rows);
}

function mergeCollectionEntryIds(
  entries: CollectionView["entries"],
  ids: string[]
) {
  const existingIds = new Set(entries.map((entry) => entry.library_entry_id));
  return [
    ...entries,
    ...ids
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ library_entry_id: id })),
  ];
}
