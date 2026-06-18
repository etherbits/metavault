import { Home } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { AddToCollectionDialog } from "@/components/AddToCollectionDialog";
import { HomeSection } from "@/components/HomeSection";
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useRenameCollection,
  useSyncCollections,
} from "@/features/collections/hooks";
import {
  useLibraryEntries,
  useUpdateLibraryEntry,
  useUpdateLibraryEntryPersonalRating,
} from "@/features/library/hooks";
import type { MediaItem, MediaStatus } from "@/features/library/types";

export function HomePage() {
  const navigate = useNavigate();
  const libraryQuery = useLibraryEntries();
  const collectionsQuery = useCollections();
  const updateEntry = useUpdateLibraryEntry();
  const updatePersonalRating = useUpdateLibraryEntryPersonalRating();
  const syncCollections = useSyncCollections();
  const createCollection = useCreateCollection();
  const renameCollection = useRenameCollection();
  const deleteCollection = useDeleteCollection();

  const libraryItems = libraryQuery.data ?? [];
  const collections = collectionsQuery.data ?? [];

  const [homeHiddenIds, setHomeHiddenIds] = useState<string[]>([]);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [pendingCollectionIds, setPendingCollectionIds] = useState<string[]>(
    []
  );
  const handleCardStatusChange = (cardId: string, status: MediaStatus) => {
    updateEntry.mutate({ ids: [cardId], status });
  };

  const handleCardRemoveStatus = (cardId: string) => {
    updateEntry.mutate({ ids: [cardId], status: undefined });
  };

  const handleCardPersonalRatingChange = (
    cardId: string,
    personalRating: number
  ) => {
    updatePersonalRating.mutate({ id: cardId, personalRating });
  };

  const handleCardDeleteFromHome = (cardId: string) => {
    setHomeHiddenIds((previous) => [...new Set([...previous, cardId])]);
  };

  const handleCardAddToCollection = (cardId: string) => {
    setPendingCollectionIds([cardId]);
    setCollectionDialogOpen(true);
  };

  const handleConfirmAddToCollection = async (collectionIds: string[]) => {
    if (pendingCollectionIds.length === 0) {
      setCollectionDialogOpen(false);
      return;
    }
    await syncCollections.mutateAsync({
      ids: pendingCollectionIds,
      collectionIds,
      collections,
    });
    setCollectionDialogOpen(false);
    setPendingCollectionIds([]);
  };

  const handleCreateCollection = async (name: string) => {
    const result = await createCollection.mutateAsync({
      name,
    });

    return result.createdId;
  };

  const handleRenameCollection = async (id: string, name: string) => {
    await renameCollection.mutateAsync({ id, name });
  };

  const handleDeleteCollection = async (id: string) => {
    await deleteCollection.mutateAsync(id);
  };

  const handleViewDetails = (item: MediaItem) => {
    navigate(`/app/detail/${item.id}`);
  };

  const handleQueryMore = (prefilledQuery: string) => {
    navigate(`/app/query?query=${encodeURIComponent(prefilledQuery)}`);
  };

  const homeHiddenSet = new Set(homeHiddenIds);
  const visibleLibraryItems = libraryItems.filter(
    (item) => !homeHiddenSet.has(item.id)
  );

  const homeSections = [
    {
      id: "in_progress",
      title: "In Progress",
      query: "status:in_progress",
      defaultOpen: true,
      items: visibleLibraryItems.filter(
        (item) => item.status === "In Progress"
      ),
    },
    {
      id: "recently_added",
      title: "Recently added",
      query: "sort:created_at:descending",
      defaultOpen: true,
      items: visibleLibraryItems,
    },
    ...collections.map((collection) => ({
      id: collection.id,
      title: collection.name,
      query: toCollectionQuery(collection.name),
      defaultOpen: false,
      items: getCollectionItems(collection.entries, visibleLibraryItems),
      collection,
    })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
      <div className="flex items-center gap-3">
        <Home size={28} className="text-[#A1A1AA]" />
        <h1 className="text-2xl font-semibold leading-none text-[#D4D4D8] sm:text-[30px]">
          Home
        </h1>
      </div>

      <div className="flex w-full flex-col gap-12">
        {homeSections.map((section) => (
          <HomeSection
            key={section.id}
            title={section.title}
            count={section.items.length}
            items={section.items}
            loading={libraryQuery.isLoading}
            defaultOpen={section.defaultOpen}
            onChangeStatus={handleCardStatusChange}
            onRemoveStatus={handleCardRemoveStatus}
            onDelete={handleCardDeleteFromHome}
            onAddToCollection={handleCardAddToCollection}
            onViewDetails={handleViewDetails}
            collection={section.collection}
            onRenameCollection={handleRenameCollection}
            onDeleteCollection={handleDeleteCollection}
            onChangePersonalRating={handleCardPersonalRatingChange}
            personalRatingPending={updatePersonalRating.isPending}
            onQueryMore={
              section.query ? () => handleQueryMore(section.query) : undefined
            }
          />
        ))}
      </div>

      <AddToCollectionDialog
        open={collectionDialogOpen}
        targetIds={pendingCollectionIds}
        collections={collections}
        onConfirm={handleConfirmAddToCollection}
        onCreateCollection={handleCreateCollection}
        isSaving={syncCollections.isPending}
        isCreatingCollection={createCollection.isPending}
        createCollectionError={
          createCollection.error instanceof Error
            ? createCollection.error.message
            : null
        }
        onCancel={() => {
          setCollectionDialogOpen(false);
          setPendingCollectionIds([]);
        }}
      />
    </div>
  );
}

function toCollectionQuery(collectionName: string) {
  return `/search collection:${collectionName.replaceAll(" ", "_")}`;
}

function getCollectionItems(
  entries: { library_entry_id: string }[],
  items: MediaItem[]
) {
  const entryIds = new Set(entries.map((entry) => entry.library_entry_id));
  return items.filter((item) => entryIds.has(item.id));
}
