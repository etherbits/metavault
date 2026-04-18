import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  Star,
  MoreHorizontal,
  Maximize2,
  Clapperboard,
  BookOpen,
  Gamepad2,
  Tv,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusDropdown } from "./StatusDropdown";

export type MediaType =
  | "Movie"
  | "TV Show"
  | "Anime"
  | "Game"
  | "Book"
  | "Manga"
  | "Other";

export type MediaStatus =
  | "On Hold"
  | "In Progress"
  | "Planning"
  | "Dropped"
  | "Finished";

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status?: MediaStatus;
  date: string;
  rating: string;
  tags: string[];
  posterUrl?: string;
}

interface MediaCardProps {
  item: MediaItem;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEnterSelectMode?: (id: string) => void;
  onChangeStatus?: (id: string, status: MediaStatus) => void;
  onRemoveStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddToCollection?: (id: string) => void;
}

function getTypeIcon(type: MediaType) {
  switch (type) {
    case "Movie":
      return <Clapperboard size={12} />;
    case "TV Show":
    case "Anime":
      return <Tv size={12} />;
    case "Game":
      return <Gamepad2 size={12} />;
    case "Book":
    case "Manga":
      return <BookOpen size={12} />;
    default:
      return <FileText size={12} />;
  }
}

export function MediaCard({
  item,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onEnterSelectMode,
  onChangeStatus,
  onRemoveStatus,
  onDelete,
  onAddToCollection,
}: MediaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLDivElement | null>(null);

  function handleToggleMenu() {
    if (!menuOpen) {
      const triggerRect = menuButtonRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const panelWidth = 186;
        const panelHeight = 248;
        const gap = 12;

        const nextLeft = Math.max(8, triggerRect.left - panelWidth - gap);
        const nextTop = Math.max(8, triggerRect.bottom - panelHeight);

        setMenuPosition({ top: nextTop, left: nextLeft });
      }
    }

    setMenuOpen((prev) => !prev);
  }

  function handleCardClick() {
    if (selectMode) {
      onToggleSelect?.(item.id);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    function handleViewportChange() {
      setMenuOpen(false);
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [menuOpen]);

  return (
    <Card
      className={`relative h-full min-h-[300px] w-full overflow-visible rounded-[4px] border-none bg-[#27272A] py-0 text-white ring-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] sm:max-w-[420px] ${
        menuOpen ? "z-40" : ""
      } ${selected ? "ring-2 ring-[#FACC15]" : ""}`}
      onClick={handleCardClick}
    >
      <div className="flex h-full flex-col sm:flex-row">
        <div className="h-52 w-full shrink-0 overflow-hidden rounded-t-[4px] bg-black sm:h-[300px] sm:max-w-[200px] sm:basis-[46%] sm:rounded-l-[4px] sm:rounded-tr-none">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <CardContent className="flex w-full min-w-0 flex-1 flex-col gap-4 px-4 py-3">
          <h3 className="truncate text-lg font-medium leading-7 text-[#F4F4F5] sm:text-[20px]">
            {item.title}
          </h3>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#FACC15] px-2 text-[12px] font-semibold leading-4 text-[#FACC15]">
                {getTypeIcon(item.type)}
                {item.type}
              </span>

              {item.status && (
                <span className="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#60A5FA] px-2 text-[12px] font-semibold leading-4 text-[#60A5FA]">
                  <FileText size={12} />
                  {item.status}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="inline-flex h-5 w-fit items-center gap-1 rounded-[8px] bg-[#3F3F46] px-2 text-[12px] font-semibold leading-4 text-[#FAFAFA]">
                <Calendar size={12} />
                {item.date}
              </span>

              <span className="inline-flex h-5 w-fit items-center gap-1 rounded-[8px] bg-[#3F3F46] px-2 text-[12px] font-semibold leading-4 text-[#FAFAFA]">
                <Star size={12} />
                {item.rating}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-5 items-center rounded-[8px] border border-[#3F3F46] bg-white/5 px-2 text-[12px] font-semibold leading-4 text-[#FAFAFA]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-end gap-3">
            <div className="relative" ref={menuRef}>
              <div ref={menuButtonRef}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleToggleMenu();
                  }}
                  className="h-6 w-6 rounded-[4px] border-[#3F3F46] bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <MoreHorizontal size={16} />
                </Button>
              </div>

              {menuOpen && (
                <StatusDropdown
                  className="fixed z-[500]"
                  selectMode={selectMode}
                  onSelect={() => {
                    onEnterSelectMode?.(item.id);
                    setMenuOpen(false);
                  }}
                  currentStatus={item.status}
                  onChangeStatus={(next) => {
                    onChangeStatus?.(item.id, next);
                    setMenuOpen(false);
                  }}
                  onAddToCollection={() => {
                    onAddToCollection?.(item.id);
                    setMenuOpen(false);
                  }}
                  onDelete={() => {
                    onDelete?.(item.id);
                    setMenuOpen(false);
                  }}
                  onRemoveStatus={() => {
                    onRemoveStatus?.(item.id);
                    setMenuOpen(false);
                  }}
                  submenuSide="left"
                  style={{
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                  }}
                />
              )}
            </div>

            <Button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
              }}
              className="h-8 rounded-[8px] bg-[#FACC15] px-[10px] text-[14px] font-medium leading-5 text-[#27272A] hover:bg-[#eab308]"
            >
              <Maximize2 size={16} />
              View Details
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
