import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { QueryInput } from "@/components/QueryInput";
import { HomeSection } from "@/components/HomeSection";
import { IntegrationCard } from "@/components/IntegrationCard";
import { NotePanel } from "@/components/NotePanel";
import { Pagination } from "@/components/Pagination";
import { Menu } from "lucide-react";
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
    posterUrl: undefined,
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
  const [activePage, setActivePage] = useState<Page>("home");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  return (
    <div className="flex h-screen bg-[#0e0e0e] overflow-hidden">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-6 py-4 border-b border-[#1f1f1f] bg-[#0e0e0e] shrink-0">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="text-[#555] hover:text-white transition-colors p-1"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="flex-1 max-w-xl">
            <QueryInput
              value={query}
              onChange={setQuery}
              onSearch={(v) => console.log("search:", v)}
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {activePage === "home" && (
            <div className="flex flex-col gap-8 max-w-5xl mx-auto">
              <HomeSection
                title="In Progress"
                count={2}
                items={SAMPLE_ITEMS.filter((i) => i.status === "In Progress")}
              />
              <HomeSection
                title="Recently Finished"
                count={4}
                items={SAMPLE_ITEMS.filter((i) => i.status === "Finished")}
              />
              <HomeSection
                title="On Hold"
                count={1}
                items={SAMPLE_ITEMS.filter((i) => i.status === "On Hold")}
                defaultOpen={false}
              />
              <div className="flex justify-between items-center">
                <NotePanel placeholder="Add a note about your media..." />
              </div>
              <div className="flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={8}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}

          {activePage === "query" && (
            <div className="max-w-5xl mx-auto">
              <Card className="bg-[#141414] border-[#1f1f1f]">
                <CardContent className="pt-6">
                  <h2 className="text-white text-lg font-semibold mb-4">
                    Query Explorer
                  </h2>
                  <p className="text-[#666] text-sm">
                    Use the search bar above to query your media collection.
                    <br />
                    Example:{" "}
                    <code className="text-[#aaa] bg-[#1e1e1e] px-1 rounded">
                      tag:action status:finished
                    </code>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {activePage === "integrations" && (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <h2 className="text-white text-lg font-semibold">Integrations</h2>
              <IntegrationCard
                name="TMDB"
                description="Fetch movie and TV show metadata from The Movie Database."
                queryFlag="source:tmdb"
                onSave={(k) => console.log("save tmdb key", k)}
                onClear={() => console.log("clear tmdb")}
              />
              <IntegrationCard
                name="AniList"
                description="Sync your anime and manga list from AniList."
                queryFlag="source:anilist"
                onSave={(k) => console.log("save anilist key", k)}
                onClear={() => console.log("clear anilist")}
              />
              <IntegrationCard
                name="RAWG"
                description="Pull game data and reviews from RAWG.io."
                queryFlag="source:rawg"
                onSave={(k) => console.log("save rawg key", k)}
                onClear={() => console.log("clear rawg")}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
