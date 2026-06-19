import {
  BookMarked,
  BookOpen,
  Film,
  Flag,
  FolderOpen,
  Gamepad2,
  Tv,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MediaStatus, MediaType } from "@/features/library/types";

// --- Type Badge ---
const typeIcons: Record<MediaType, ReactNode> = {
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
    bg: "bg-[#3F3F46]/40",
    text: "text-[#A1A1AA]",
    border: "border-[#71717A]",
  },
  "In Progress": {
    bg: "bg-[#FACC16]/10",
    text: "text-[#FACC16]",
    border: "border-[#FACC16]",
  },
  Planning: {
    bg: "bg-[#A78BFA]/10",
    text: "text-[#A78BFA]",
    border: "border-[#A78BFA]",
  },
  Dropped: {
    bg: "bg-[#F87171]/10",
    text: "text-[#F87171]",
    border: "border-[#F87171]",
  },
  Finished: {
    bg: "bg-[#60A5FA]/10",
    text: "text-[#60A5FA]",
    border: "border-[#60A5FA]",
  },
};

export function getStatusBadgeTone(status: MediaStatus) {
  return statusConfig[status] ?? statusConfig["On Hold"];
}

interface StatusBadgeProps {
  status: MediaStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = getStatusBadgeTone(status);
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[8px] border px-2 text-[12px] font-semibold leading-4",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Flag size={12} />
      {status}
    </span>
  );
}
