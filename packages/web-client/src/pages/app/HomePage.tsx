import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AddToCollectionDialog } from "@/components/AddToCollectionDialog";
import { HomeSection } from "@/components/HomeSection";
import {
  useAddToCollection,
  useCollections,
} from "@/features/collections/hooks";
import {
  useLibraryEntries,
  useUpdateLibraryEntry,
} from "@/features/library/hooks";
import type { MediaItem, MediaStatus } from "@/features/library/types";

export function HomePage() {
  const navigate = useNavigate();
  const libraryQuery = useLibraryEntries();
  const collectionsQuery = useCollections();
  const updateEntry = useUpdateLibraryEntry();
  const addToCollection = useAddToCollection();

  const libraryItems = libraryQuery.data ?? [];
  const collections = collectionsQuery.data ?? [];

  const [homeHiddenIds, setHomeHiddenIds] = useState<string[]>([]);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [pendingCollectionIds, setPendingCollectionIds] = useState<string[]>(
    []
  );
  const [selectedCollection, setSelectedCollection] = useState("");

  useEffect(() => {
    if (collections.length > 0 && selectedCollection === "") {
      setSelectedCollection(collections[0].id);
    }
  }, [collections, selectedCollection]);

  const handleCardStatusChange = (cardId: string, status: MediaStatus) => {
    updateEntry.mutate({ ids: [cardId], status });
  };

  const handleCardRemoveStatus = (cardId: string) => {
    updateEntry.mutate({ ids: [cardId], status: undefined });
  };

  const handleCardDeleteFromHome = (cardId: string) => {
    setHomeHiddenIds((previous) => [...new Set([...previous, cardId])]);
  };

  const handleCardAddToCollection = (cardId: string) => {
    setPendingCollectionIds([cardId]);
    setCollectionDialogOpen(true);
  };

  const handleConfirmAddToCollection = async () => {
    if (pendingCollectionIds.length === 0 || selectedCollection === "") {
      setCollectionDialogOpen(false);
      return;
    }
    await addToCollection.mutateAsync({
      ids: pendingCollectionIds,
      collectionId: selectedCollection,
      collections,
    });
    setCollectionDialogOpen(false);
    setPendingCollectionIds([]);
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
      query: undefined,
      defaultOpen: false,
      items: getCollectionItems(collection.entries, visibleLibraryItems),
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
            onQueryMore={
              section.query ? () => handleQueryMore(section.query) : undefined
            }
          />
        ))}
      </div>

      <AddToCollectionDialog
        open={collectionDialogOpen}
        selectedCollection={selectedCollection}
        collections={collections}
        onCollectionChange={setSelectedCollection}
        onConfirm={handleConfirmAddToCollection}
        onCancel={() => {
          setCollectionDialogOpen(false);
          setPendingCollectionIds([]);
        }}
      />
    </div>
  );
}

function getCollectionItems(
  entries: { library_entry_id: string }[],
  items: MediaItem[]
) {
  const entryIds = new Set(entries.map((entry) => entry.library_entry_id));
  return items.filter((item) => entryIds.has(item.id));
}
