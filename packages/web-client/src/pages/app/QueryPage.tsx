import { Bot, Database, Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AddToCollectionDialog } from "@/components/AddToCollectionDialog";
import { MediaCard } from "@/components/MediaCard";
import { Pagination } from "@/components/Pagination";
import {
  CanonicalQueryPreview,
  QueryExecutionState,
} from "@/components/QueryFeedback";
import { QueryInput } from "@/components/QueryInput";
import { Button } from "@/components/ui/button";
import {
  type AssistantMessage,
  AssistantPanel,
  type AssistantSession,
} from "@/features/assistant/AssistantPanel";
import { streamAssistantMessage } from "@/features/assistant/api";
import {
  useAssistantSessions,
  useSaveAssistantSession,
} from "@/features/assistant/hooks";
import {
  useCollections,
  useCreateCollection,
  useSyncCollections,
} from "@/features/collections/hooks";
import {
  useDeleteLibraryEntry,
  useExportLibraryEntries,
  useImportLibraryEntries,
  useUpdateLibraryEntry,
  useUpdateLibraryEntryPersonalRating,
  useUploadLibraryEntryImage,
} from "@/features/library/hooks";
import { toServerMediaType, toServerStatus } from "@/features/library/mappers";
import { paginateItems } from "@/features/library/pagination";
import type { MediaItem, MediaStatus } from "@/features/library/types";
import { useLibrarySearch } from "@/features/library/useLibrarySearch";
import { useLibrarySelection } from "@/features/library/useLibrarySelection";
import {
  pickImageFile,
  pickZipFile,
  saveBlobFile,
} from "@/shared/browser/files";

const QUERY_PAGE_SIZE = 9;
const INITIAL_ASSISTANT_SESSION_ID = "initial-assistant-session";

export function QueryPage() {
  const navigate = useNavigate();
  const updateEntry = useUpdateLibraryEntry();
  const deleteEntry = useDeleteLibraryEntry();
  const importEntries = useImportLibraryEntries();
  const exportEntries = useExportLibraryEntries();
  const syncCollections = useSyncCollections();
  const createCollection = useCreateCollection();
  const uploadEntryImage = useUploadLibraryEntryImage();
  const updatePersonalRating = useUpdateLibraryEntryPersonalRating();
  const assistantSessionsQuery = useAssistantSessions();
  const saveAssistantSession = useSaveAssistantSession();

  const search = useLibrarySearch();
  const selection = useLibrarySelection(search.queryResults);

  const [currentPage, setCurrentPage] = useState(1);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantFullscreen, setAssistantFullscreen] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantSending, setAssistantSending] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [assistantSessions, setAssistantSessions] = useState<
    AssistantSession[]
  >([
    {
      id: INITIAL_ASSISTANT_SESSION_ID,
      title: "New chat",
      messages: [],
    },
  ]);
  const [activeAssistantSessionId, setActiveAssistantSessionId] = useState(
    INITIAL_ASSISTANT_SESSION_ID
  );
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [pendingCollectionIds, setPendingCollectionIds] = useState<string[]>(
    []
  );
  const collectionsQuery = useCollections({ enabled: collectionDialogOpen });
  const collections = collectionsQuery.data ?? [];

  const queryInputRef = useRef<HTMLInputElement>(null);
  const wasQueryExecuting = useRef(false);
  const assistantSessionsLoaded = useRef(false);

  useEffect(() => {
    if (wasQueryExecuting.current && !search.isQueryExecuting) {
      queryInputRef.current?.focus();
    }
    wasQueryExecuting.current = search.isQueryExecuting;
  }, [search.isQueryExecuting]);

  useEffect(() => {
    if (assistantSessionsLoaded.current || !assistantSessionsQuery.data) {
      return;
    }

    assistantSessionsLoaded.current = true;
    if (assistantSessionsQuery.data.length === 0) {
      return;
    }

    setAssistantSessions(assistantSessionsQuery.data);
    setActiveAssistantSessionId(assistantSessionsQuery.data[0].id);
  }, [assistantSessionsQuery.data]);

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

  const handleUploadImage = (cardId: string) => {
    pickImageFile(async (file) => {
      await uploadEntryImage.mutateAsync({ id: cardId, file });
      await search.refreshQuery();
    });
  };

  const handleCardPersonalRatingChange = async (
    cardId: string,
    personalRating: number
  ) => {
    await updatePersonalRating.mutateAsync({ id: cardId, personalRating });
    await search.refreshQuery();
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
  const activeAssistantSession =
    assistantSessions.find(
      (session) => session.id === activeAssistantSessionId
    ) ?? assistantSessions[0];

  const handleNewAssistantSession = () => {
    const session: AssistantSession = {
      id: crypto.randomUUID(),
      title: "New chat",
      messages: [],
    };

    setAssistantSessions((previous) => [session, ...previous]);
    setActiveAssistantSessionId(session.id);
    setAssistantDraft("");
    setAssistantError(null);
  };

  const handleAssistantSubmit = async () => {
    const message = assistantDraft.trim();
    if (!message || assistantSending || !activeAssistantSession) return;

    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    const assistantMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    const previousMessages = activeAssistantSession.messages;
    const userTurnSession = {
      ...activeAssistantSession,
      title:
        activeAssistantSession.messages.length === 0
          ? createAssistantSessionTitle(message)
          : activeAssistantSession.title,
      messages: [
        ...activeAssistantSession.messages,
        userMessage,
        assistantMessage,
      ],
    };

    setAssistantSessions((previous) =>
      previous.map((session) =>
        session.id === activeAssistantSession.id ? userTurnSession : session
      )
    );
    setAssistantDraft("");
    const userTurnSave = saveAssistantSession
      .mutateAsync({
        id: userTurnSession.id,
        input: {
          title: userTurnSession.title,
          messages: userTurnSession.messages.filter(
            (item) => item.id !== assistantMessage.id
          ),
        },
      })
      .catch(() => null);

    setAssistantSending(true);
    setAssistantError(null);

    try {
      const streamedMessage = await streamAssistantMessage({
        input: {
          message,
          history: previousMessages.map(({ role, content }) => ({
            role,
            content,
          })),
          context: {
            currentQuery: search.query || undefined,
            canonicalQuery: search.canonicalQuery || undefined,
            visibleResults: pagination.items.map(toAssistantVisibleResult), // TODO: no need for mapping this, we can include all fields
          },
        },
        onDelta: (delta) => {
          setAssistantSessions((previous) =>
            previous.map((session) =>
              session.id === activeAssistantSession.id
                ? appendAssistantMessageDelta(
                    session,
                    assistantMessage.id,
                    delta
                  )
                : session
            )
          );
        },
      });
      const completedSession = {
        ...userTurnSession,
        messages: userTurnSession.messages.map((item) =>
          item.id === assistantMessage.id
            ? { ...item, content: streamedMessage }
            : item
        ),
      };

      setAssistantSessions((previous) =>
        previous.map((session) =>
          session.id === activeAssistantSession.id ? completedSession : session
        )
      );
      await userTurnSave;
      await saveAssistantSession.mutateAsync({
        id: completedSession.id,
        input: {
          title: completedSession.title,
          messages: completedSession.messages,
        },
      });
    } catch (error) {
      setAssistantError(
        error instanceof Error
          ? error.message
          : "Unable to send assistant message"
      );
      setAssistantSessions((previous) =>
        previous.map((session) =>
          session.id === activeAssistantSession.id
            ? {
                ...session,
                messages: session.messages.filter(
                  (item) => item.id !== assistantMessage.id
                ),
              }
            : session
        )
      );
    } finally {
      setAssistantSending(false);
    }
  };

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

          <CanonicalQueryPreview
            query={search.canonicalQuery}
            error={search.canonicalQueryError}
          />

          {search.isQueryExecuting ? (
            <QueryExecutionState
              isExecuting={search.isQueryExecuting}
              resultCount={search.queryResults.length}
            />
          ) : search.queryResults.length === 0 ? (
            <QueryExecutionState
              isExecuting={search.isQueryExecuting}
              resultCount={search.queryResults.length}
              error={search.queryError}
            />
          ) : (
            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
              <QueryExecutionState
                isExecuting={search.isQueryExecuting}
                resultCount={search.queryResults.length}
                error={search.queryError}
              />

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
                onUploadImage={handleUploadImage}
                onViewDetails={handleViewDetails}
                onChangePersonalRating={handleCardPersonalRatingChange}
                personalRatingPending={updatePersonalRating.isPending}
              />
            ))}
          </div>
        ) : null}
      </div>

      {assistantOpen ? (
        <AssistantPanel
          draft={assistantDraft}
          sessions={assistantSessions}
          activeSessionId={activeAssistantSessionId}
          isSending={assistantSending}
          errorMessage={assistantError}
          fullscreen={assistantFullscreen}
          onSelectSession={(id) => {
            setActiveAssistantSessionId(id);
            setAssistantError(null);
          }}
          onNewSession={handleNewAssistantSession}
          onToggleFullscreen={() =>
            setAssistantFullscreen((previous) => !previous)
          }
          onDraftChange={setAssistantDraft}
          onSubmit={handleAssistantSubmit}
          onClose={() => {
            setAssistantOpen(false);
            setAssistantFullscreen(false);
          }}
        />
      ) : null}

      {!assistantOpen ? (
        <Button
          type="button"
          variant="brand"
          size="icon"
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-6 right-4 z-[60] h-10 w-10 rounded-[8px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] sm:bottom-12 sm:right-12"
          aria-label="Open assistant chat"
        >
          <Bot size={20} />
        </Button>
      ) : null}

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
    </>
  );
}

function toAssistantVisibleResult(item: MediaItem) {
  return {
    id: item.id,
    title: item.title,
    media_type: toServerMediaType(item.type),
    status: item.status ? toServerStatus(item.status) : null,
    adult: item.adult,
    public_rating: parseDisplayRating(item.rating),
    personal_rating: item.personalRating,
    tags: item.tags,
  };
}

function parseDisplayRating(rating: string) {
  const value = Number.parseFloat(rating.split("/")[0]?.trim() ?? "");
  return Number.isFinite(value) ? value : null;
}

function createAssistantSessionTitle(message: string) {
  const words = message
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  return words.length > 0 ? words.join(" ") : "New chat";
}

function appendAssistantMessageDelta(
  session: AssistantSession,
  messageId: string,
  delta: string
): AssistantSession {
  return {
    ...session,
    messages: session.messages.map((message) =>
      message.id === messageId
        ? { ...message, content: `${message.content}${delta}` }
        : message
    ),
  };
}
