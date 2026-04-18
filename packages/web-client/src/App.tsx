import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { HomeSection } from "@/components/HomeSection";
import { QueryInput } from "@/components/QueryInput";
import { IntegrationCard } from "@/components/IntegrationCard";
import { NotePanel } from "@/components/NotePanel";
import { Pagination } from "@/components/Pagination";
import {
  ChevronUp,
  Database,
  Download,
  Home,
  Menu,
  Upload,
} from "lucide-react";
import {
  MediaCard,
  type MediaItem,
  type MediaStatus,
} from "@/components/MediaCard";
import "./index.css";

type Page = "home" | "query" | "integrations";

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

const HOME_SECTION_QUERIES = {
  recentlyAdded: "all",
  inProgress: 'status:"In Progress"',
  collection: "tag:collection",
} as const;

const QUERY_PAGE_SIZE = 9;

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

  const statusMatch = trimmed.match(/status:\s*"?([^"]+)"?/i);
  if (statusMatch?.[1]) {
    const parsedStatus = statusMatch[1].trim();
    if (isMediaStatus(parsedStatus)) {
      return items.filter((item) => item.status === parsedStatus);
    }
  }

  const tagMatch = trimmed.match(/tag:\s*"?([^"]+)"?/i);
  if (tagMatch?.[1]) {
    const parsedTag = tagMatch[1].trim().toLowerCase();
    if (parsedTag === "collection") {
      const collectionSet = new Set(collectionIds);
      return items.filter((item) => collectionSet.has(item.id));
    }

    return items.filter((item) =>
      item.tags.some((tag) => tag.toLowerCase() === parsedTag)
    );
  }

  const needle = trimmed.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(needle) ||
      item.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
      item.type.toLowerCase().includes(needle)
  );
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
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 1024;
  });
  const [activePage, setActivePage] = useState<Page>("query");
  const [query, setQuery] = useState("");
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>(QUERY_ITEMS);
  const [lastImportedIds, setLastImportedIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [homeHiddenIds, setHomeHiddenIds] = useState<string[]>([]);
  const [queryResults, setQueryResults] = useState<MediaItem[]>(QUERY_ITEMS);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const handleQuerySearch = (value: string) => {
    const results = runQuery(
      value,
      libraryItems,
      lastImportedIds,
      collectionIds
    );
    setQuery(value);
    setQueryResults(results);
    setCurrentPage(1);
    setSelectMode(false);
    setSelectedIds([]);
  };

  const handleQueryMore = (prefilledQuery: string) => {
    setActivePage("query");
    handleQuerySearch(prefilledQuery);
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
    const mergedIds = new Set([...collectionIds, ...targetIds]);
    const nextCollectionIds = [...mergedIds];

    setCollectionIds(nextCollectionIds);
    setQueryResults(
      runQuery(query, libraryItems, lastImportedIds, nextCollectionIds)
    );
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

  const handleClearSelection = () => {
    setSelectMode(false);
    setSelectedIds([]);
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
  const homeRecentlyAddedItems = libraryItems;
  const homeInProgressItems = libraryItems.filter(
    (item) => item.status === "In Progress"
  );
  const homeCollectionItems = libraryItems.filter((item) =>
    collectionIds.includes(item.id)
  );
  const homeHiddenSet = new Set(homeHiddenIds);
  const visibleHomeRecentlyAddedItems = homeRecentlyAddedItems.filter(
    (item) => !homeHiddenSet.has(item.id)
  );
  const visibleHomeInProgressItems = homeInProgressItems.filter(
    (item) => !homeHiddenSet.has(item.id)
  );
  const visibleHomeCollectionItems = homeCollectionItems.filter(
    (item) => !homeHiddenSet.has(item.id)
  );

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
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

  return (
    <div className="relative flex h-dvh min-h-screen overflow-hidden bg-[#18181B] text-white">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
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
                <HomeSection
                  title="Recently Added"
                  count={visibleHomeRecentlyAddedItems.length}
                  items={visibleHomeRecentlyAddedItems}
                  defaultOpen
                  onChangeStatus={handleCardStatusChange}
                  onRemoveStatus={handleCardRemoveStatus}
                  onDelete={handleCardDeleteFromHome}
                  onAddToCollection={handleCardAddToCollection}
                  onQueryMore={() =>
                    handleQueryMore(HOME_SECTION_QUERIES.recentlyAdded)
                  }
                />

                <HomeSection
                  title="In Progress"
                  count={visibleHomeInProgressItems.length}
                  items={visibleHomeInProgressItems}
                  defaultOpen
                  onChangeStatus={handleCardStatusChange}
                  onRemoveStatus={handleCardRemoveStatus}
                  onDelete={handleCardDeleteFromHome}
                  onAddToCollection={handleCardAddToCollection}
                  onQueryMore={() =>
                    handleQueryMore(HOME_SECTION_QUERIES.inProgress)
                  }
                />

                <HomeSection
                  title="Collection"
                  count={visibleHomeCollectionItems.length}
                  items={visibleHomeCollectionItems}
                  defaultOpen
                  onChangeStatus={handleCardStatusChange}
                  onRemoveStatus={handleCardRemoveStatus}
                  onDelete={handleCardDeleteFromHome}
                  onAddToCollection={handleCardAddToCollection}
                  onQueryMore={() =>
                    handleQueryMore(HOME_SECTION_QUERIES.collection)
                  }
                />

                <div className="flex items-center justify-between">
                  <NotePanel placeholder="Add a note about your media..." />
                </div>
              </div>
            </div>
          )}

          {activePage === "query" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-8">
              <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="flex items-center gap-3">
                  <Database size={28} className="text-[#A1A1AA]" />
                  <h1 className="text-2xl font-semibold leading-none tracking-[-1px] text-[#D4D4D8] sm:text-[30px]">
                    Query
                  </h1>
                </div>

                <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
                  {selectedIds.length > 0 && (
                    <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
                      <span className="rounded-[10px] border border-[#3F3F46] bg-white/5 px-3 py-2 text-[14px] text-[#FAFAFA]">
                        {selectedIds.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="h-10 rounded-[10px] border border-[#3F3F46] bg-white/5 px-4 text-[14px] font-medium text-[#FAFAFA] transition hover:bg-white/10"
                      >
                        Clear selection
                      </button>
                    </div>
                  )}

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
              </div>

              <div className="w-full">
                <QueryInput
                  value={query}
                  onChange={setQuery}
                  onSearch={handleQuerySearch}
                  placeholder="Search tag:action,comedy"
                />
              </div>

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
                  />
                ))}
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
    </div>
  );
}

export default App;
