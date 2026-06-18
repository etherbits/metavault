import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
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

      const created = await apiRequest(
        "/collections",
        collectionResponseSchema,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      return {
        createdId: created.id,
        collections: await fetchCollections(),
      };
    },
    onSuccess: ({ collections }) => {
      updateCollectionsCache(queryClient, collections);
    },
  });
}

export function useSyncCollections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      collectionIds,
      collections,
    }: {
      ids: string[];
      collectionIds: string[];
      collections: CollectionView[];
    }) => {
      const selectedCollectionIds = new Set(collectionIds);
      const knownCollectionIds = new Set(
        collections.map((collection) => collection.id)
      );

      if (
        collectionIds.some(
          (collectionId) => !knownCollectionIds.has(collectionId)
        )
      ) {
        throw new Error("Collection not found");
      }

      const updates = collections
        .map((collection) => {
          const entries = syncCollectionEntryIds(
            collection.entries,
            ids,
            selectedCollectionIds.has(collection.id)
          );
          if (sameEntryIds(entries, collection.entries)) return null;

          const body = updateCollectionSchema.parse({ entries });

          return apiRequest(
            `/collections/${collection.id}`,
            collectionResponseSchema,
            {
              method: "PATCH",
              body: JSON.stringify(body),
            }
          );
        })
        .filter((update) => update !== null);

      await Promise.all(updates);

      if (updates.length === 0) {
        return collections;
      }

      return fetchCollections();
    },
    onSuccess: (collections) => {
      updateCollectionsCache(queryClient, collections);
    },
  });
}

export function useRenameCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const body = updateCollectionSchema.parse({ name });

      await apiRequest(`/collections/${id}`, collectionResponseSchema, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      return fetchCollections();
    },
    onSuccess: (collections) => {
      updateCollectionsCache(queryClient, collections);
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(
        `/collections/${id}`,
        z.object({ message: z.string() }),
        {
          method: "DELETE",
        }
      );

      return fetchCollections();
    },
    onSuccess: (collections) => {
      updateCollectionsCache(queryClient, collections);
    },
  });
}

function updateCollectionsCache(
  queryClient: ReturnType<typeof useQueryClient>,
  collections: CollectionView[]
) {
  queryClient.setQueryData(queryKeys.collections.all, collections);
  queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
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

function syncCollectionEntryIds(
  entries: CollectionView["entries"],
  ids: string[],
  selected: boolean
) {
  const existingIds = new Set(entries.map((entry) => entry.library_entry_id));
  if (!selected) {
    const idsToRemove = new Set(ids);
    return entries.filter((entry) => !idsToRemove.has(entry.library_entry_id));
  }

  return [
    ...entries,
    ...ids
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ library_entry_id: id })),
  ];
}

function sameEntryIds(
  first: CollectionView["entries"],
  second: CollectionView["entries"]
) {
  if (first.length !== second.length) return false;

  const secondIds = new Set(second.map((entry) => entry.library_entry_id));
  return first.every((entry) => secondIds.has(entry.library_entry_id));
}
