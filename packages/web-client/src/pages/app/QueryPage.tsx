import { Bot, Database, Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AddToCollectionDialog } from "@/components/AddToCollectionDialog";
import { MediaCard } from "@/components/MediaCard";
import { Pagination } from "@/components/Pagination";
import { QueryInput } from "@/components/QueryInput";
import { Button } from "@/components/ui/button";
import { AssistantPanel } from "@/features/assistant/AssistantPanel";
import {
  useAddToCollection,
  useCollections,
} from "@/features/collections/hooks";
import {
  useDeleteLibraryEntry,
  useExportLibraryEntries,
  useImportLibraryEntries,
  useUpdateLibraryEntry,
} from "@/features/library/hooks";
import { paginateItems } from "@/features/library/pagination";
import type { MediaItem, MediaStatus } from "@/features/library/types";
import { useLibrarySearch } from "@/features/library/useLibrarySearch";
import { useLibrarySelection } from "@/features/library/useLibrarySelection";
import { pickZipFile, saveBlobFile } from "@/shared/browser/files";

const QUERY_PAGE_SIZE = 9;

export function QueryPage() {
  const navigate = useNavigate();
  const updateEntry = useUpdateLibraryEntry();
  const deleteEntry = useDeleteLibraryEntry();
  const importEntries = useImportLibraryEntries();
  const exportEntries = useExportLibraryEntries();
  const addToCollection = useAddToCollection();

  const search = useLibrarySearch();
  const selection = useLibrarySelection(search.queryResults);

  const [currentPage, setCurrentPage] = useState(1);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [pendingCollectionIds, setPendingCollectionIds] = useState<string[]>(
    []
  );
  const [selectedCollection, setSelectedCollection] = useState("");

  const collectionsQuery = useCollections({ enabled: collectionDialogOpen });
  const collections = collectionsQuery.data ?? [];

  const queryInputRef = useRef<HTMLInputElement>(null);
  const wasQueryExecuting = useRef(false);

  useEffect(() => {
    if (wasQueryExecuting.current && !search.isQueryExecuting) {
      queryInputRef.current?.focus();
    }
    wasQueryExecuting.current = search.isQueryExecuting;
  }, [search.isQueryExecuting]);

  useEffect(() => {
    if (collections.length > 0 && selectedCollection === "") {
      setSelectedCollection(collections[0].id);
    }
  }, [collections, selectedCollection]);

  const handleQuerySearch = (value: string) => {
    search.handleQuerySearch(value);
    setCurrentPage(1);
    selection.clearSelection();
  };

  const handleCardStatusChange = async (
    cardId: string,
    status: MediaStatus
  ) => {
    const ids = selection.resolveActionIds(cardId);
    await updateEntry.mutateAsync({ ids, status });
    await search.refreshQuery();
  };

  const handleCardRemoveStatus = async (cardId: string) => {
    const ids = selection.resolveActionIds(cardId);
    await updateEntry.mutateAsync({ ids, status: undefined });
    await search.refreshQuery();
  };

  const handleCardDelete = async (cardId: string) => {
    const targetIds = selection.resolveActionIds(cardId);
    const targetSet = new Set(targetIds);

    selection.setSelectedIds((previous) =>
      previous.filter((id) => !targetSet.has(id))
    );
    await deleteEntry.mutateAsync(targetIds);
    await search.refreshQuery();
  };

  const handleCardAddToCollection = (cardId: string) => {
    setPendingCollectionIds(selection.resolveActionIds(cardId));
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

  const handleExportItems = async () => {
    const ids =
      selection.selectMode && selection.selectedIds.length > 0
        ? selection.selectedIds
        : [];

    const blob = await exportEntries.mutateAsync(ids);
    await saveBlobFile("metavault-export.zip", blob, {
      description: "metavault library archive",
      accept: {
        "application/zip": [".zip"],
      },
    });
  };

  const handleImportItems = () => {
    pickZipFile(async (file) => {
      const items = await importEntries.mutateAsync(file);

      search.clearQuery();
      setCurrentPage(1);
      selection.clearSelection();
      search.replaceQueryResults(items);
    });
  };

  const handleViewDetails = (item: MediaItem) => {
    navigate(`/app/detail/${item.id}`);
  };

  const pagination = paginateItems(
    search.queryResults,
    currentPage,
    QUERY_PAGE_SIZE
  );

  useEffect(() => {
    if (currentPage !== pagination.currentPage) {
      setCurrentPage(pagination.currentPage);
    }
  }, [currentPage, pagination.currentPage]);

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3">
            <Database size={28} className="text-[#A1A1AA]" />
            <h1 className="text-2xl font-semibold leading-none text-[#D4D4D8] sm:text-[30px]">
              Query
            </h1>
          </div>

          {!search.isQueryExecuting ? (
            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
              <Button
                type="button"
                variant="surface"
                onClick={handleExportItems}
                className="h-8 flex-1 px-2.5 text-[14px] sm:flex-none"
              >
                <Download size={16} />
                Export Items
              </Button>

              <Button
                type="button"
                variant="surface"
                onClick={handleImportItems}
                className="h-8 flex-1 px-2.5 text-[14px] sm:flex-none"
              >
                <Upload size={16} />
                Import Items
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-4">
          <QueryInput
            inputRef={queryInputRef}
            value={search.query}
            action={search.queryAction}
            onChange={search.handleQueryChange}
            onSearch={handleQuerySearch}
            placeholder="Query your library with EZQ"
            disabled={search.isQueryExecuting}
          />

          {search.canonicalQuery !== "" ? (
            <div className="flex w-full items-start gap-3 rounded-[8px] border border-[#27272A] bg-[#18181B]/70 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="shrink-0 text-[12px] font-medium uppercase leading-5 tracking-[0.08em] text-[#71717A]">
                Canonical
              </span>
              <code className="min-w-0 flex-1 break-words font-mono text-[13px] leading-5 text-[#D4D4D8]">
                {search.canonicalQuery}
              </code>
            </div>
          ) : search.canonicalQueryError ? (
            <div className="flex w-full items-start gap-3 rounded-[8px] border border-[#7F1D1D]/70 bg-[#450A0A]/20 px-3 py-2">
              <span className="shrink-0 text-[12px] font-medium uppercase leading-5 tracking-[0.08em] text-[#FCA5A5]">
                Canonical
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-5 text-[#F87171]">
                {search.canonicalQueryError}
              </p>
            </div>
          ) : null}

          {search.isQueryExecuting ? (
            <p className="text-[14px] leading-5 text-[#A1A1AA]">
              Executing query...
            </p>
          ) : search.queryResults.length === 0 ? (
            search.queryError ? (
              <p className="w-fit max-w-[358px] text-[14px] leading-5 text-[#F87171]">
                {search.queryError}
              </p>
            ) : (
              <p className="text-[14px] leading-5 text-[#A1A1AA]">
                No results found
              </p>
            )
          ) : (
            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
              <p className="text-[14px] leading-5 text-[#A1A1AA]">
                Retrieved {search.queryResults.length} results
              </p>

              <div className="flex items-center justify-start sm:justify-end">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </div>

        {!search.isQueryExecuting && search.queryResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3 2xl:gap-8">
            {pagination.items.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                selectMode={selection.selectMode}
                selected={selection.selectedIds.includes(item.id)}
                onToggleSelect={selection.toggleCardSelection}
                onEnterSelectMode={selection.enterSelectMode}
                onChangeStatus={handleCardStatusChange}
                onRemoveStatus={handleCardRemoveStatus}
                onDelete={handleCardDelete}
                onAddToCollection={handleCardAddToCollection}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        ) : null}
      </div>

      {assistantOpen ? (
        <AssistantPanel
          draft={assistantDraft}
          onDraftChange={setAssistantDraft}
        />
      ) : null}

      <Button
        type="button"
        variant="brand"
        size="icon"
        onClick={() => setAssistantOpen((previous) => !previous)}
        className="fixed bottom-6 right-4 z-[60] h-10 w-10 rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] sm:bottom-12 sm:right-12"
        aria-label={
          assistantOpen ? "Close assistant chat" : "Open assistant chat"
        }
      >
        <Bot size={20} />
      </Button>

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
    </>
  );
}
