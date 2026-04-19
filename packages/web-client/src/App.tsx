import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { HomeSection } from "@/components/HomeSection";
import { QueryInput } from "@/components/QueryInput";
import { IntegrationCard } from "@/components/IntegrationCard";
import { NotePanel } from "@/components/NotePanel";
import { Pagination } from "@/components/Pagination";
import { AddToCollectionDialog } from "@/components/AddToCollectionDialog";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Database,
  Download,
  Flag,
  GripVertical,
  Home,
  Link2,
  MessageSquarePlus,
  Menu,
  Pencil,
  Plus,
  Save,
  SendHorizontal,
  Sparkles,
  Star,
  Settings,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import {
  MediaCard,
  type MediaItem,
  type MediaStatus,
} from "@/components/MediaCard";
import HeroPoster from "@/assets/hero.png";
import "./index.css";

type Page = "home" | "query" | "integrations" | "settings";

const SAMPLE_ITEMS: MediaItem[] = [
  {
    id: "1",
    title: "Attack on Titan",
    type: "Anime",
    status: "Finished",
    date: "2023-11-04",
    rating: "9.5 / 10",
    tags: ["action", "drama", "fantasy"],
  },
  {
    id: "2",
    title: "The Last of Us",
    type: "Game",
    status: "Finished",
    date: "2023-06-12",
    rating: "10 / 10",
    tags: ["survival", "story"],
  },
  {
    id: "3",
    title: "Dune",
    type: "Movie",
    status: "Finished",
    date: "2024-03-01",
    rating: "8.8 / 10",
    tags: ["sci-fi", "epic"],
  },
  {
    id: "4",
    title: "Chainsaw Man",
    type: "Manga",
    status: "In Progress",
    date: "2024-01-10",
    rating: "9.0 / 10",
    tags: ["action", "horror"],
  },
  {
    id: "5",
    title: "Breaking Bad",
    type: "TV Show",
    status: "Finished",
    date: "2022-09-30",
    rating: "10 / 10",
    tags: ["crime", "drama"],
  },
  {
    id: "6",
    title: "Elden Ring",
    type: "Game",
    status: "On Hold",
    date: "2024-02-14",
    rating: "9.2 / 10",
    tags: ["rpg", "souls-like"],
  },
];

const HOME_SECTIONS = [
  {
    title: "Recently added",
    query: "all",
    defaultOpen: true,
  },
  {
    title: "In Progress",
    query: 'status:"In Progress"',
    defaultOpen: true,
  },
  {
    title: "Dark tone collection",
    query: 'tag:"Dark tone collection"',
    defaultOpen: false,
  },
  {
    title: "Trilogy collection",
    query: 'tag:"Trilogy collection"',
    defaultOpen: false,
  },
  {
    title: "Dropped",
    query: 'status:"Dropped"',
    defaultOpen: false,
  },
] as const;

const QUERY_PAGE_SIZE = 9;
const COLLECTION_OPTIONS = [
  "Dark tone collection",
  "Trilogy collection",
  "Favorites",
];

const QUERY_ITEMS: MediaItem[] = Array.from({ length: 18 }, (_, index) => {
  const source = SAMPLE_ITEMS[index % SAMPLE_ITEMS.length];
  return {
    ...source,
    id: `query-${index + 1}`,
  };
});

function isMediaStatus(value: string): value is MediaStatus {
  return ["On Hold", "In Progress", "Planning", "Dropped", "Finished"].includes(
    value
  );
}

function isMediaType(value: string): value is MediaItem["type"] {
  return [
    "Movie",
    "TV Show",
    "Anime",
    "Game",
    "Book",
    "Manga",
    "Other",
  ].includes(value);
}

function runQuery(
  input: string,
  items: MediaItem[],
  lastImportedIds: string[],
  collectionIds: string[]
): MediaItem[] {
  const trimmed = input.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "all") {
    return items;
  }

  if (trimmed.toLowerCase() === "target:last_import") {
    const idSet = new Set(lastImportedIds);
    return items.filter((item) => idSet.has(item.id));
  }

  let filteredItems = items;
  let hasStructuredFilters = false;

  const statusMatch = trimmed.match(/status:\s*"?([^"]+)"?/i);
  if (statusMatch?.[1]) {
    hasStructuredFilters = true;
    const parsedStatus = statusMatch[1].trim();
    if (isMediaStatus(parsedStatus)) {
      filteredItems = filteredItems.filter(
        (item) => item.status === parsedStatus
      );
    }
  }

  const tagMatch = trimmed.match(/tag:\s*"?([^"]+)"?/i);
  if (tagMatch?.[1]) {
    hasStructuredFilters = true;
    const parsedTag = tagMatch[1].trim().toLowerCase();
    if (parsedTag === "collection") {
      const collectionSet = new Set(collectionIds);
      filteredItems = filteredItems.filter((item) =>
        collectionSet.has(item.id)
      );
    } else {
      const parsedTags = parsedTag
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (parsedTags.length > 1) {
        filteredItems = filteredItems.filter((item) => {
          const itemTags = item.tags.map((tag) => tag.toLowerCase());
          return parsedTags.every((tag) => itemTags.includes(tag));
        });
      } else {
        filteredItems = filteredItems.filter((item) =>
          item.tags.some((tag) => tag.toLowerCase() === parsedTag)
        );
      }
    }
  }

  const titleMatch = trimmed.match(/title:\s*"?([^"]+)"?/i);
  if (titleMatch?.[1]) {
    hasStructuredFilters = true;
    const parsedTitle = titleMatch[1].trim().toLowerCase();
    filteredItems = filteredItems.filter((item) =>
      item.title.toLowerCase().includes(parsedTitle)
    );
  }

  const typeMatch = trimmed.match(/(?:content_type|type):\s*"?([^"]+)"?/i);
  if (typeMatch?.[1]) {
    hasStructuredFilters = true;
    const parsedType = typeMatch[1].trim().toLowerCase();
    filteredItems = filteredItems.filter(
      (item) => item.type.toLowerCase() === parsedType
    );
  }

  if (hasStructuredFilters) {
    return filteredItems;
  }

  const needle = trimmed.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) ||
      item.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
      item.type.toLowerCase().includes(needle)
  );
}

const VALID_QUERY_PREFIXES = new Set([
  "tag",
  "status",
  "target",
  "release",
  "public_rating",
  "description",
  "alias",
  "type",
  "content_type",
  "title",
]);

function getQueryValidationError(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const matches = trimmed.matchAll(/\b([a-z_]+):/gi);
  for (const match of matches) {
    const prefix = match[1]?.toLowerCase();
    if (prefix && !VALID_QUERY_PREFIXES.has(prefix)) {
      return `Invalid query: “${prefix}” is not a valid metadata prefix`;
    }
  }

  return null;
}

function normalizeImportedItems(raw: unknown): Omit<MediaItem, "id">[] | null {
  if (!Array.isArray(raw)) return null;

  const normalized = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const data = entry as Partial<MediaItem>;
      const title = typeof data.title === "string" ? data.title.trim() : "";
      if (!title) return null;

      const tags = Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is string => typeof tag === "string")
        : [];

      const status =
        typeof data.status === "string" && isMediaStatus(data.status)
          ? data.status
          : undefined;

      const type =
        typeof data.type === "string" && isMediaType(data.type)
          ? data.type
          : "Other";

      return {
        title,
        type,
        status,
        date: typeof data.date === "string" ? data.date : "-",
        rating: typeof data.rating === "string" ? data.rating : "-",
        tags,
        posterUrl:
          typeof data.posterUrl === "string" ? data.posterUrl : undefined,
      } as Omit<MediaItem, "id">;
    })
    .filter((item): item is Omit<MediaItem, "id"> => item !== null);

  return normalized.length > 0 ? normalized : null;
}

export function App() {
  const initialQuery = "";
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [activePage, setActivePage] = useState<Page>("query");
  const [query, setQuery] = useState(initialQuery);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>(QUERY_ITEMS);
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [homeHiddenIds, setHomeHiddenIds] = useState<string[]>([]);
  const [queryResults, setQueryResults] = useState<MediaItem[]>(QUERY_ITEMS);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [pendingCollectionIds, setPendingCollectionIds] = useState<string[]>(
    []
  );
  const [selectedCollection, setSelectedCollection] = useState(
    COLLECTION_OPTIONS[0]
  );
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isQueryExecuting, setIsQueryExecuting] = useState(false);
  const [aliasMappings, setAliasMappings] = useState([
    { id: "1", alias: "good_action", query: "tag:action,combat rating:>7.5" },
    {
      id: "2",
      alias: "comfort",
      query: "tag:comedy collection:family_classics",
    },
  ]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [detailViewItemId, setDetailViewItemId] = useState<string | null>(null);
  const queryTimerRef = useRef<number | null>(null);
  const isCreateQuery = query.trim().toLowerCase().startsWith("create ");
  const isUpdateQuery = query.trim().toLowerCase().startsWith("update ");
  const isDeleteQuery = query.trim().toLowerCase().startsWith("delete ");

  const clearQueryTimer = useCallback(() => {
    if (queryTimerRef.current !== null) {
      window.clearTimeout(queryTimerRef.current);
      queryTimerRef.current = null;
    }
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setQueryError(null);
    setIsQueryExecuting(false);
  };

  const handleQuerySearch = (value: string) => {
    clearQueryTimer();

    const validationError = getQueryValidationError(value);
    setQuery(value);

    if (validationError) {
      setQueryError(validationError);
      setIsQueryExecuting(false);
      setQueryResults([]);
      setCurrentPage(1);
      setSelectMode(false);
      setSelectedIds([]);
      return;
    }

    setQueryError(null);
    setIsQueryExecuting(true);

    queryTimerRef.current = window.setTimeout(() => {
      const results = runQuery(
        value,
        libraryItems,
        lastImportedIds,
        collectionIds
      );
      setQueryResults(results);
      setCurrentPage(1);
      setSelectMode(false);
      setSelectedIds([]);
      setIsQueryExecuting(false);
      queryTimerRef.current = null;
    }, 600);
  };

  useEffect(() => {
    return () => {
      clearQueryTimer();
    };
  }, [clearQueryTimer]);

  const handleQueryMore = (prefilledQuery: string) => {
    setDetailViewItemId(null);
    setActivePage("query");
    handleQuerySearch(prefilledQuery);
  };

  const handleViewDetails = (item: MediaItem) => {
    setDetailViewItemId(item.id);
    setSelectMode(false);
    setSelectedIds([]);
    setActivePage("query");
  };

  const applyLibraryUpdate = (
    updater: (items: MediaItem[]) => MediaItem[],
    nextImportedIds: string[] = lastImportedIds,
    nextQuery: string = query,
    nextCollectionIds: string[] = collectionIds
  ) => {
    setLibraryItems((previousItems) => {
      const updatedItems = updater(previousItems);
      setQueryResults(
        runQuery(nextQuery, updatedItems, nextImportedIds, nextCollectionIds)
      );
      return updatedItems;
    });
  };

  const resolveActionIds = (cardId: string): string[] => {
    if (selectMode && selectedIds.length > 0) {
      return selectedIds;
    }
    return [cardId];
  };

  const handleCardStatusChange = (cardId: string, status: MediaStatus) => {
    const targetIds = new Set(resolveActionIds(cardId));
    applyLibraryUpdate((items) =>
      items.map((item) =>
        targetIds.has(item.id)
          ? {
              ...item,
              status,
            }
          : item
      )
    );
  };

  const handleCardRemoveStatus = (cardId: string) => {
    const targetIds = new Set(resolveActionIds(cardId));
    applyLibraryUpdate((items) =>
      items.map((item) =>
        targetIds.has(item.id)
          ? {
              ...item,
              status: undefined,
            }
          : item
      )
    );
  };

  const handleCardDelete = (cardId: string) => {
    const targetIds = new Set(resolveActionIds(cardId));
    const nextCollectionIds = collectionIds.filter((id) => !targetIds.has(id));

    if (detailViewItemId !== null && targetIds.has(detailViewItemId)) {
      setDetailViewItemId(null);
    }

    setCollectionIds(nextCollectionIds);
    setHomeHiddenIds((previousIds) =>
      previousIds.filter((id) => !targetIds.has(id))
    );
    setSelectedIds((previousIds) =>
      previousIds.filter((id) => !targetIds.has(id))
    );
    applyLibraryUpdate(
      (items) => items.filter((item) => !targetIds.has(item.id)),
      lastImportedIds,
      query,
      nextCollectionIds
    );
  };

  const handleCardDeleteFromHome = (cardId: string) => {
    const targetIds = new Set(resolveActionIds(cardId));

    setHomeHiddenIds((previousIds) => {
      const merged = new Set([...previousIds, ...targetIds]);
      return [...merged];
    });

    setSelectedIds((previousIds) =>
      previousIds.filter((id) => !targetIds.has(id))
    );
  };

  const handleCardAddToCollection = (cardId: string) => {
    const targetIds = resolveActionIds(cardId);
    setPendingCollectionIds(targetIds);
    setCollectionDialogOpen(true);
  };

  const handleConfirmAddToCollection = () => {
    if (pendingCollectionIds.length === 0) {
      setCollectionDialogOpen(false);
      return;
    }

    const targetSet = new Set(pendingCollectionIds);
    const collectionLabel = selectedCollection.trim();
    const mergedIds = new Set([...collectionIds, ...pendingCollectionIds]);
    const nextCollectionIds = [...mergedIds];

    setCollectionIds(nextCollectionIds);
    applyLibraryUpdate(
      (items) =>
        items.map((item) => {
          if (!targetSet.has(item.id) || collectionLabel === "") {
            return item;
          }

          const hasCollectionTag = item.tags.some(
            (tag) => tag.toLowerCase() === collectionLabel.toLowerCase()
          );

          if (hasCollectionTag) {
            return item;
          }

          return {
            ...item,
            tags: [...item.tags, collectionLabel],
          };
        }),
      lastImportedIds,
      query,
      nextCollectionIds
    );

    setCollectionDialogOpen(false);
    setPendingCollectionIds([]);
  };

  const handleCancelAddToCollection = () => {
    setCollectionDialogOpen(false);
    setPendingCollectionIds([]);
  };

  const handleEnterSelectMode = (cardId: string) => {
    setSelectMode(true);
    setSelectedIds((previousIds) => {
      if (previousIds.includes(cardId)) return previousIds;
      return [...previousIds, cardId];
    });
  };

  const handleToggleCardSelection = (cardId: string) => {
    if (!selectMode) return;
    setSelectedIds((previousIds) =>
      previousIds.includes(cardId)
        ? previousIds.filter((id) => id !== cardId)
        : [...previousIds, cardId]
    );
  };

  const handleExportItems = async () => {
    const selectedSet = new Set(selectedIds);
    const itemsToExport =
      selectMode && selectedIds.length > 0
        ? queryResults.filter((item) => selectedSet.has(item.id))
        : queryResults;

    const payload = JSON.stringify(itemsToExport, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const picker = (
      window as Window & {
        showSaveFilePicker?: (options: {
          suggestedName?: string;
          types?: Array<{
            description?: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }
    ).showSaveFilePicker;

    if (picker) {
      const handle = await picker({
        suggestedName: "metavault-export.json",
        types: [
          {
            description: "JSON",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "metavault-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportItems = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const normalized = normalizeImportedItems(parsed);
        if (!normalized) return;

        const stamp = Date.now();
        const importedItems: MediaItem[] = normalized.map((item, index) => ({
          ...item,
          id: `import-${stamp}-${index + 1}`,
        }));
        const importedIds = importedItems.map((item) => item.id);
        const importQuery = "target:last_import";

        setLastImportedIds(importedIds);
        setQuery(importQuery);
        setActivePage("query");
        setCurrentPage(1);
        setSelectMode(false);
        setSelectedIds([]);
        applyLibraryUpdate(
          (items) => [...importedItems, ...items],
          importedIds,
          importQuery
        );
      } catch {
        console.error("Invalid import file");
      }
    };
    input.click();
  };

  const totalPages = Math.max(
    1,
    Math.ceil(queryResults.length / QUERY_PAGE_SIZE)
  );
  const startIndex = (currentPage - 1) * QUERY_PAGE_SIZE;
  const paginatedQueryItems = queryResults.slice(
    startIndex,
    startIndex + QUERY_PAGE_SIZE
  );
  const homeHiddenSet = new Set(homeHiddenIds);
  const homeSections = HOME_SECTIONS.map((section) => {
    const items = runQuery(
      section.query,
      libraryItems,
      lastImportedIds,
      collectionIds
    ).filter((item) => !homeHiddenSet.has(item.id));

    return {
      ...section,
      items,
    };
  });

  const detailViewItem =
    detailViewItemId === null
      ? null
      : (libraryItems.find((item) => item.id === detailViewItemId) ?? null);

  const numericRating = detailViewItem
    ? Number.parseFloat(detailViewItem.rating.replace(/[^\d.]/g, ""))
    : Number.NaN;
  const personalRating = Number.isFinite(numericRating)
    ? Math.max(0, Math.min(5, numericRating / 2))
    : 4.5;
  const fullStars = Math.floor(personalRating);
  const hasHalfStar = personalRating - fullStars >= 0.5;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleNavigate = (page: Page) => {
    if (page !== "query") {
      setDetailViewItemId(null);
    }
    setActivePage(page);
  };

  const handleSignOut = () => {
    setIsSignedOut(true);
    setSidebarOpen(false);
    setSelectMode(false);
    setSelectedIds([]);
  };

  const handleSignIn = () => {
    setIsSignedOut(false);
    setSidebarOpen(window.innerWidth >= 1024);
  };

  const handleAliasChange = (
    id: string,
    field: "alias" | "query",
    value: string
  ) => {
    setAliasMappings((previous) =>
      previous.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              [field]: value,
            }
          : entry
      )
    );
  };

  const handleAddAlias = () => {
    const stamp = Date.now().toString();
    setAliasMappings((previous) => [
      ...previous,
      {
        id: stamp,
        alias: "new_alias",
        query: "tag:example",
      },
    ]);
  };

  const handleDeleteAlias = (id: string) => {
    setAliasMappings((previous) => previous.filter((entry) => entry.id !== id));
  };

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const visibleIds = new Set(queryResults.map((item) => item.id));
    setSelectedIds((previousIds) =>
      previousIds.filter((id) => visibleIds.has(id))
    );
  }, [queryResults]);

  if (isSignedOut) {
    return (
      <div className="flex h-dvh min-h-screen items-center justify-center bg-[#18181B] p-6 text-white">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-[#3F3F46] bg-[#09090B] p-8 text-center shadow-[0px_12px_32px_rgba(0,0,0,0.35)]">
          <h1 className="text-2xl font-semibold text-[#FAFAFA]">Signed out</h1>
          <p className="text-sm text-[#A1A1AA]">
            You have been logged out of MetaVault.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="mt-2 h-10 rounded-[10px] border border-[#3F3F46] bg-white/5 px-4 text-sm font-medium text-[#FAFAFA] transition hover:bg-white/10"
          >
            Sign in again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh min-h-screen overflow-hidden bg-[#18181B] text-white">
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
        onSignOut={handleSignOut}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <div className="flex flex-1 flex-col overflow-visible">
        {!sidebarOpen && (
          <header className="flex shrink-0 items-center border-b border-[#1F1F29] bg-[#18181B] px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={handleToggleSidebar}
              className="p-1 text-[#A1A1AA] transition hover:text-white"
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>
          </header>
        )}

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-16 lg:py-12">
          {activePage === "home" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
              <div className="flex items-center gap-3">
                <Home size={28} className="text-[#A1A1AA]" />
                <h1 className="text-2xl font-semibold leading-none tracking-[-1px] text-[#D4D4D8] sm:text-[30px]">
                  Home
                </h1>
              </div>

              <div className="flex w-full flex-col gap-12">
                {homeSections.map((section) => (
                  <HomeSection
                    key={section.title}
                    title={section.title}
                    count={section.items.length}
                    items={section.items}
                    defaultOpen={section.defaultOpen}
                    onChangeStatus={handleCardStatusChange}
                    onRemoveStatus={handleCardRemoveStatus}
                    onDelete={handleCardDeleteFromHome}
                    onAddToCollection={handleCardAddToCollection}
                    onViewDetails={handleViewDetails}
                    onQueryMore={() => handleQueryMore(section.query)}
                  />
                ))}

                <div className="flex items-center justify-between">
                  <NotePanel placeholder="Add a note about your media..." />
                </div>
              </div>
            </div>
          )}

          {activePage === "query" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-8">
              {detailViewItem ? (
                <>
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Clapperboard size={28} className="text-[#A1A1AA]" />
                      <h1 className="text-2xl font-semibold leading-none tracking-[-1px] text-[#D4D4D8] sm:text-[30px]">
                        {detailViewItem.title}
                      </h1>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailViewItemId(null)}
                      className="inline-flex h-9 items-center rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-sm font-medium text-[#FAFAFA] shadow-sm hover:bg-white/10"
                    >
                      Back to results
                    </button>
                  </div>

                  <div className="flex flex-col gap-8 xl:flex-row xl:gap-10">
                    <section className="flex w-full max-w-[400px] flex-col gap-8">
                      <div className="relative h-auto w-full overflow-hidden rounded-[4px] shadow-[4px_0px_16px_rgba(164,37,36,0.18)]">
                        <img
                          src={detailViewItem.posterUrl ?? HeroPoster}
                          alt={detailViewItem.title}
                          className="h-full min-h-[460px] w-full object-cover"
                        />

                        <div className="absolute left-3 top-3 inline-flex h-[35px] items-center gap-3 rounded-[4px] border border-[#60A5FA] bg-[#27272A]/60 px-3 backdrop-blur-[4px]">
                          <Flag size={20} className="text-[#60A5FA]" />
                          <span className="text-[18px] font-medium leading-[27px] text-[#60A5FA]">
                            {detailViewItem.status ?? "On Hold"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="inline-flex h-[35px] w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
                          <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
                            <Clapperboard size={24} />
                            Content Type
                          </span>
                          <span className="px-3 text-[18px] font-medium leading-[27px] text-[#D4D4D8]">
                            {detailViewItem.type}
                          </span>
                        </div>

                        <div className="inline-flex h-[35px] w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
                          <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
                            <CalendarDays size={24} />
                            Release Date
                          </span>
                          <span className="px-3 text-[18px] font-medium leading-[27px] text-[#D4D4D8]">
                            {detailViewItem.date}
                          </span>
                        </div>

                        <div className="inline-flex h-[35px] w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
                          <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
                            <Star size={24} />
                            Public Rating
                          </span>
                          <span className="px-3 text-[18px] font-medium leading-[27px] text-[#D4D4D8]">
                            {detailViewItem.rating}
                          </span>
                        </div>

                        <div className="inline-flex h-[35px] w-fit items-center overflow-hidden rounded-[6px] bg-[#3F3F46]">
                          <span className="inline-flex h-full items-center gap-2 rounded-l-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]">
                            <Sparkles size={24} />
                            Personal Rating
                          </span>
                          <div className="inline-flex items-center gap-0.5 px-3">
                            {Array.from({ length: fullStars }).map((_, idx) => (
                              <Star
                                key={`full-${idx}`}
                                size={20}
                                className="fill-[#FACC15] text-[#FACC15]"
                              />
                            ))}
                            {hasHalfStar && (
                              <Star
                                size={20}
                                className="fill-[#FACC15]/50 text-[#FACC15]"
                              />
                            )}
                            {Array.from({ length: emptyStars }).map(
                              (_, idx) => (
                                <Star
                                  key={`empty-${idx}`}
                                  size={20}
                                  className="text-[#FACC15]"
                                />
                              )
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                          {detailViewItem.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex h-[35px] items-center rounded-[6px] bg-[#262626] px-[10px] text-[18px] font-medium leading-[27px] text-[#A1A1AA]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="flex min-w-0 flex-1 flex-col gap-6 pt-2 xl:pt-10">
                      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-[32px] font-semibold leading-[36px] tracking-[-1px] text-[#FAFAFA]">
                          Content Nodes
                        </h2>

                        <button
                          type="button"
                          className="inline-flex h-9 w-fit items-center gap-2 rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-sm font-medium text-[#FAFAFA] opacity-60 shadow-sm"
                        >
                          <Plus size={16} />
                          Add New
                        </button>
                      </div>

                      <div className="flex w-full flex-col gap-3">
                        {[
                          `${detailViewItem.title}: Blu-ray 2160p`,
                          `${detailViewItem.title}: 1080P`,
                        ].map((nodeTitle) => (
                          <div
                            key={nodeTitle}
                            className="flex items-center gap-2"
                          >
                            <div className="flex h-[41px] min-w-0 flex-1 items-center gap-1.5 rounded-[8px] bg-[#27272A] px-3 text-left">
                              <GripVertical
                                size={20}
                                className="shrink-0 text-[#A1A1AA]"
                              />
                              <span className="truncate text-[34px] font-semibold leading-[27px] text-[#D4D4D8] [font-size:clamp(16px,1.2vw,30px)]">
                                {nodeTitle}
                              </span>
                            </div>

                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FAFAFA] opacity-60 shadow-sm"
                            >
                              <Link2 size={16} />
                            </button>

                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FAFAFA] opacity-60 shadow-sm"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#7F1D1D]/40 text-[#F87171]"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}

                        <div className="flex w-full flex-wrap items-center gap-2">
                          <div className="flex h-[41px] min-w-[250px] flex-1 items-center gap-2 rounded-[8px] border border-[#3F3F46] bg-[#27272A] px-3 text-[#71717A]">
                            <Type size={16} />
                            <span className="text-[18px] font-semibold leading-[27px]">
                              Movie name
                            </span>
                          </div>

                          <div className="flex h-10 min-w-[250px] flex-1 items-center gap-2 rounded-[6px] border border-[#3F3F46] bg-[#27272A] px-3 text-[#71717A]">
                            <Link2 size={16} />
                            <span className="text-[16px] leading-6">
                              http://sample.link
                            </span>
                          </div>

                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FAFAFA] opacity-60 shadow-sm"
                          >
                            <Save size={16} />
                          </button>

                          <button
                            type="button"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#7F1D1D]/40 text-[#F87171]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-3">
                      <Database size={28} className="text-[#A1A1AA]" />
                      <h1 className="text-2xl font-semibold leading-none tracking-[-1px] text-[#D4D4D8] sm:text-[30px]">
                        Query
                      </h1>
                    </div>

                    {!isQueryExecuting && !isCreateQuery && (
                      <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
                        <button
                          type="button"
                          onClick={handleExportItems}
                          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-[#3F3F46] bg-white/5 px-2.5 text-[14px] font-medium text-[#FAFAFA] shadow-sm transition hover:bg-white/10 sm:flex-none"
                        >
                          <Download size={16} />
                          Export Items
                        </button>

                        <button
                          type="button"
                          onClick={handleImportItems}
                          className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-[#3F3F46] bg-white/5 px-2.5 text-[14px] font-medium text-[#FAFAFA] shadow-sm transition hover:bg-white/10 sm:flex-none"
                        >
                          <Upload size={16} />
                          Import Items
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex w-full flex-col gap-4">
                    <QueryInput
                      value={query}
                      onChange={handleQueryChange}
                      onSearch={handleQuerySearch}
                      placeholder="Search tag:action,comedy"
                      mode={
                        isCreateQuery
                          ? "create"
                          : isUpdateQuery
                            ? "update"
                            : isDeleteQuery
                              ? "delete"
                              : "search"
                      }
                    />

                    {isQueryExecuting ? (
                      <p className="text-[14px] leading-5 text-[#A1A1AA]">
                        Executing query...
                      </p>
                    ) : isCreateQuery ? (
                      <p className="text-[14px] leading-5 text-[#A1A1AA]">
                        Created {queryResults.length}{" "}
                        {queryResults.length === 1 ? "item" : "items"}
                      </p>
                    ) : queryResults.length === 0 ? (
                      queryError ? (
                        <p className="w-fit max-w-[358px] text-[14px] leading-5 text-[#F87171]">
                          {queryError}
                        </p>
                      ) : (
                        <p className="text-[14px] leading-5 text-[#A1A1AA]">
                          No results found
                        </p>
                      )
                    ) : (
                      <div className="flex w-full items-center justify-between gap-4">
                        <p className="text-[14px] leading-5 text-[#A1A1AA]">
                          Retrieved {queryResults.length} results
                        </p>

                        <div className="flex justify-start sm:justify-end">
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {!isQueryExecuting && queryResults.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 xl:grid-cols-3">
                      {paginatedQueryItems.map((item) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          selectMode={selectMode}
                          selected={selectedIds.includes(item.id)}
                          onToggleSelect={handleToggleCardSelection}
                          onEnterSelectMode={handleEnterSelectMode}
                          onChangeStatus={handleCardStatusChange}
                          onRemoveStatus={handleCardRemoveStatus}
                          onDelete={handleCardDelete}
                          onAddToCollection={handleCardAddToCollection}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activePage === "settings" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Settings size={28} className="text-[#A1A1AA]" />
                  <h1 className="text-2xl font-semibold leading-none tracking-[-1px] text-[#D4D4D8] sm:text-[30px]">
                    Settings
                  </h1>
                </div>

                <button
                  type="button"
                  className="flex h-9 items-center gap-2 rounded-[8px] bg-[#FACC15]/50 px-3 text-sm font-medium text-[#09090B]"
                >
                  <Save size={16} />
                  Save
                </button>
              </div>

              <div className="mx-auto flex w-full max-w-[548px] flex-col gap-12">
                <section className="flex flex-col gap-8">
                  <h2 className="text-[30px] font-semibold leading-[30px] tracking-[-1px] text-[#D4D4D8]">
                    Query settings
                  </h2>

                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex flex-col gap-3">
                        <p className="text-sm leading-5 text-[#D4D4D4]">
                          Alias Mappings
                        </p>
                        <p className="text-sm leading-5 text-[#A3A3A3]">
                          Define aliases to commonly used query segments
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddAlias}
                        className="flex h-9 items-center gap-2 rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-sm font-medium text-[#FAFAFA] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
                      >
                        <Plus size={16} />
                        Add New
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      {aliasMappings.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-3">
                          <input
                            value={entry.alias}
                            onChange={(event) =>
                              handleAliasChange(
                                entry.id,
                                "alias",
                                event.target.value
                              )
                            }
                            className="h-9 w-[180px] rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-sm leading-5 text-[#FAFAFA] outline-none"
                          />

                          <ArrowRight size={24} className="text-[#A1A1AA]" />

                          <input
                            value={entry.query}
                            onChange={(event) =>
                              handleAliasChange(
                                entry.id,
                                "query",
                                event.target.value
                              )
                            }
                            className="h-9 flex-1 rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-sm leading-5 text-[#FAFAFA] outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleDeleteAlias(entry.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#7F1D1D]/40 text-[#F87171]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-8">
                  <h3 className="text-[30px] font-semibold leading-[30px] tracking-[-1px] text-[#D4D4D8]">
                    Account Settings
                  </h3>

                  <button
                    type="button"
                    className="flex h-9 w-fit items-center gap-2 rounded-[8px] bg-[#7F1D1D]/40 px-3 text-sm font-medium text-[#F87171]"
                  >
                    <Trash2 size={16} />
                    Permanently delete account
                  </button>
                </section>
              </div>
            </div>
          )}

          {activePage === "integrations" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
              <div className="flex items-center gap-3">
                <Home size={28} className="text-[#A1A1AA]" />
                <h1 className="text-2xl font-semibold leading-none tracking-[-1px] text-[#D4D4D8] sm:text-[30px]">
                  Home
                </h1>
              </div>

              <section className="flex w-full flex-col gap-6">
                <div className="flex w-full flex-col items-start justify-between gap-4 lg:flex-row lg:items-center lg:gap-12">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[24px] font-medium leading-[29px] tracking-[-1px] text-[#D4D4D8]">
                      Source Integrations
                    </h2>
                    <span className="text-[16px] leading-6 text-[#A1A1AA]">
                      2/3 Integrations active
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="Collapse source integrations"
                    className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FAFAFA] shadow-sm"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  <IntegrationCard
                    name="TMDB"
                    description="The Movie Database (TMDB) is a community built movie and TV database. You can use it to enrich your movie and TV show library entries."
                    queryFlag="source_integration:enrich"
                    enabled={false}
                    onSave={(k) => console.log("save tmdb key", k)}
                    onClear={() => console.log("clear tmdb")}
                  />

                  <IntegrationCard
                    name="AniList"
                    description="The Movie Database (TMDB) is a community built movie and TV database. You can use it to enrich your movie and TV show library entries."
                    queryFlag="source_integration:enrich"
                    enabled
                    onSave={(k) => console.log("save anilist key", k)}
                    onClear={() => console.log("clear anilist")}
                  />

                  <IntegrationCard
                    name="IGDB"
                    description="The Movie Database (TMDB) is a community built movie and TV database. You can use it to enrich your movie and TV show library entries."
                    queryFlag="source_integration:enrich"
                    enabled
                    onSave={(k) => console.log("save igdb key", k)}
                    onClear={() => console.log("clear igdb")}
                  />
                </div>
              </section>

              <section className="flex w-full flex-col gap-6">
                <div className="flex w-full flex-col items-start justify-between gap-4 lg:flex-row lg:items-center lg:gap-12">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[24px] font-medium leading-[29px] tracking-[-1px] text-[#D4D4D8]">
                      AI Integrations
                    </h2>
                    <span className="text-[16px] leading-6 text-[#A1A1AA]">
                      1/1 Integrations active
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label="Collapse AI integrations"
                    className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FAFAFA] shadow-sm"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  <IntegrationCard
                    name="AI Floating Chat"
                    description="The Movie Database (TMDB) is a community built movie and TV database. You can use it to enrich your movie and TV show library entries."
                    queryFlag="source_integration:enrich"
                    enabled
                    onSave={(k) => console.log("save ai key", k)}
                    onClear={() => console.log("clear ai")}
                  />
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {activePage === "query" && assistantOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-[#18181B]/[0.86] backdrop-blur-[8px]" />

          <section className="fixed bottom-12 right-4 z-50 flex h-[500px] w-[calc(100vw-2rem)] max-w-[500px] flex-col gap-5 rounded-[8px] bg-[#18181B] px-5 pb-5 pt-3 shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] sm:right-8 lg:right-[104px]">
            <div className="flex h-8 items-center gap-3">
              <h3 className="flex-1 text-[20px] font-semibold leading-6 text-[#E4E4E7]">
                Metavault Assistant Chat
              </h3>

              <button
                type="button"
                className="flex h-8 items-center gap-1 rounded-[8px] border border-[#3F3F46] bg-white/5 px-2 py-1 text-xs text-[#FAFAFA] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
              >
                <span>Select an item</span>
                <ChevronDown size={16} className="text-[#A1A1AA]" />
              </button>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
              >
                <MessageSquarePlus size={16} />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-5">
              <div className="flex flex-1 flex-col gap-5 px-2">
                <p className="text-[16px] leading-6 text-[#D4D4D8]">
                  How can I help?
                </p>

                <div className="flex justify-end">
                  <div className="rounded-[6px] bg-[#27272A] px-3 py-2 text-[16px] leading-6 text-[#E4E4E7]">
                    Could you describe the current results?
                  </div>
                </div>

                <p className="text-[16px] leading-6 text-[#D4D4D8]">
                  It seems like you have 150 identical entries of the movie “The
                  Batman”. It might be caused by data duplication on the server
                  side.
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={assistantDraft}
                  onChange={(event) => setAssistantDraft(event.target.value)}
                  className="h-[100px] w-full resize-none rounded-[8px] border border-[#3F3F46] bg-white/5 p-2 pr-12 text-[14px] leading-5 text-[#FAFAFA] outline-none placeholder:text-[#A1A1AA]"
                  placeholder="Type your follow-up..."
                />

                <button
                  type="button"
                  className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#FACC15] text-[#09090B]"
                >
                  <SendHorizontal size={20} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {activePage === "query" && (
        <button
          type="button"
          onClick={() => setAssistantOpen((prev) => !prev)}
          className="fixed bottom-12 right-12 z-[60] flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#FACC15] text-[#09090B] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)]"
          aria-label={
            assistantOpen ? "Close assistant chat" : "Open assistant chat"
          }
        >
          <Bot size={20} />
        </button>
      )}

      <AddToCollectionDialog
        open={collectionDialogOpen}
        selectedCollection={selectedCollection}
        collections={COLLECTION_OPTIONS}
        onCollectionChange={setSelectedCollection}
        onConfirm={handleConfirmAddToCollection}
        onCancel={handleCancelAddToCollection}
      />
    </div>
  );
}

export default App;
