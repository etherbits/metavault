import {
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  BookMarked,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaType, MediaStatus } from "./MediaCard";

// --- Type Badge ---
const typeIcons: Record<MediaType, React.ReactNode> = {
  Movie: <Film size={10} />,
  "TV Show": <Tv size={10} />,
  Anime: <Tv size={10} />,
  Game: <Gamepad2 size={10} />,
  Book: <BookOpen size={10} />,
  Manga: <BookMarked size={10} />,
  Other: <FolderOpen size={10} />,
};

interface MediaTypeBadgeProps {
  type: MediaType;
  className?: string;
}

export function MediaTypeBadge({ type, className }: MediaTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1e1e1e] text-[#aaaaaa] border border-[#2a2a2a]",
        className
      )}
    >
      {typeIcons[type]}
      {type}
    </span>
  );
}

// --- Status Badge ---
const statusConfig: Record<
  MediaStatus,
  { bg: string; text: string; border: string }
> = {
  "On Hold": {
    bg: "bg-[#1e3a5f]",
    text: "text-[#5b9bd5]",
    border: "border-[#2a5080]",
  },
  "In Progress": {
    bg: "bg-[#1e3d2f]",
    text: "text-[#4caf7d]",
    border: "border-[#2a5540]",
  },
  Planning: {
    bg: "bg-[#2d2a1e]",
    text: "text-[#c9a227]",
    border: "border-[#4a3f10]",
  },
  Dropped: {
    bg: "bg-[#3d1e1e]",
    text: "text-[#c94040]",
    border: "border-[#552020]",
  },
  Finished: {
    bg: "bg-[#1e2d3d]",
    text: "text-[#5b9bd5]",
    border: "border-[#253a52]",
  },
};

interface StatusBadgeProps {
  status: MediaStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig["On Hold"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Loader2 size={9} className="opacity-70" />
      {status}
    </span>
  );
}
