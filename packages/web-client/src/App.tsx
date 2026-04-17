import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
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
import type { MediaItem } from "@/components/MediaCard";
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

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState<Page>("query");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0B12] text-white">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {!sidebarOpen && (
          <header className="flex shrink-0 items-center border-b border-[#1F1F29] bg-[#0B0B12] px-6 py-4">
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

        <main className="flex-1 overflow-y-auto px-14 py-10">
          {activePage === "home" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
              <div className="flex items-center gap-3">
                <Home size={28} className="text-[#A1A1AA]" />
                <h1 className="text-[30px] font-semibold leading-[30px] tracking-[-1px] text-[#D4D4D8]">
                  Home
                </h1>
              </div>

              <div className="flex w-full flex-col gap-12">
                <HomeSection
                  title="Recently Added"
                  count={15}
                  items={SAMPLE_ITEMS}
                  defaultOpen
                />

                <HomeSection
                  title="In Progress"
                  count={2}
                  items={SAMPLE_ITEMS.filter((i) => i.status === "In Progress")}
                  defaultOpen
                />

                <div className="flex items-center justify-between">
                  <NotePanel placeholder="Add a note about your media..." />
                </div>
              </div>
            </div>
          )}

          {activePage === "query" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-8">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-3">
                  <Database size={28} className="text-[#A1A1AA]" />
                  <h1 className="text-[30px] font-semibold leading-[30px] tracking-[-1px] text-[#D4D4D8]">
                    Query
                  </h1>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#3F3F46] bg-white/5 px-4 text-[14px] font-medium text-[#FAFAFA] shadow-sm transition hover:bg-white/10"
                  >
                    <Download size={14} />
                    Export Items
                  </button>

                  <button
                    type="button"
                    className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#3F3F46] bg-white/5 px-4 text-[14px] font-medium text-[#FAFAFA] shadow-sm transition hover:bg-white/10"
                  >
                    <Upload size={14} />
                    Import Items
                  </button>
                </div>
              </div>

              <div className="w-full">
                <QueryInput
                  value={query}
                  onChange={setQuery}
                  onSearch={(v) => console.log("search:", v)}
                  placeholder="Search tag:action,comedy"
                />
              </div>

              <p className="text-[16px] leading-6 text-[#A1A1AA]">
                Retrieved 150 results
              </p>

              <div className="flex justify-end">
                <Pagination
                  currentPage={currentPage}
                  totalPages={9}
                  onPageChange={setCurrentPage}
                />
              </div>

              <div className="grid grid-cols-3 gap-x-[42px] gap-y-[42px]">
                {[
                  "query-card-1",
                  "query-card-2",
                  "query-card-3",
                  "query-card-4",
                  "query-card-5",
                  "query-card-6",
                  "query-card-7",
                  "query-card-8",
                  "query-card-9",
                ].map((cardId) => (
                  <div key={cardId}>
                    <Card className="border-none bg-transparent shadow-none">
                      <CardContent className="p-0">{/* ... */}</CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activePage === "integrations" && (
            <div className="mx-auto flex w-full max-w-[1488px] flex-col gap-12">
              <div className="flex items-center gap-3">
                <Home size={28} className="text-[#A1A1AA]" />
                <h1 className="text-[30px] font-semibold leading-[30px] tracking-[-1px] text-[#D4D4D8]">
                  Home
                </h1>
              </div>

              <section className="flex w-full flex-col gap-6">
                <div className="flex w-full items-start justify-between gap-12">
                  <div className="flex items-center gap-3">
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

                <div className="grid grid-cols-3 gap-x-[44px] gap-y-8">
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
                <div className="flex w-full items-start justify-between gap-12">
                  <div className="flex items-center gap-3">
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

                <div className="grid grid-cols-3 gap-x-[44px] gap-y-8">
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
