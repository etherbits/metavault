import { Calendar, Star, MoreHorizontal, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaStatus =
  | "On Hold"
  | "In Progress"
  | "Planning"
  | "Dropped"
  | "Finished";
export type MediaType =
  | "Movie"
  | "TV Show"
  | "Anime"
  | "Game"
  | "Book"
  | "Manga"
  | "Other";

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  date: string;
  rating: string;
  tags: string[];
  posterUrl?: string;
}

interface MediaCardProps {
  item: MediaItem;
  onViewDetails?: (id: string) => void;
  onMore?: (id: string) => void;
  isSelected?: boolean;
}

const badgeBase =
  "inline-flex flex-row justify-center items-center px-2 py-0.5 gap-1 rounded-lg text-xs font-semibold font-['Geist']";

export function MediaCard({
  item,
  onViewDetails,
  onMore,
  isSelected,
}: MediaCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row w-full sm:w-[420px] sm:h-[300px] bg-[#27272A] rounded shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),_0_4px_6px_-4px_rgba(0,0,0,0.1)] border transition-colors group overflow-hidden box-border shrink-0",
        isSelected
          ? "border-[#EAB308]"
          : "border-transparent hover:border-[#EAB308]"
      )}
    >
      {/* Poster */}
      <div className="w-full sm:w-[200px] h-[200px] sm:h-[300px] shrink-0 bg-[#1a1a1a] relative">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1e1e1e] to-[#0a0a0a]" />
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col items-start p-3 sm:p-4 gap-4 flex-1 w-full min-w-0">
        {/* Title */}
        <h3 className="text-[#F4F4F5] font-medium text-[20px] leading-[27px] font-['Satoshi_Variable'] truncate w-full">
          {item.title}
        </h3>

        {/* Info Rows */}
        <div className="flex flex-col items-start gap-3 w-full flex-1">
          {/* Primary Badges (Type & Status) */}
          <div className="flex flex-row items-center gap-2 w-full flex-wrap">
            <span
              className={cn(
                badgeBase,
                "text-[#FACC15] border border-[#FACC15] bg-transparent"
              )}
            >
              {item.type}
            </span>
            <span
              className={cn(
                badgeBase,
                "text-[#60A5FA] border border-[#60A5FA] bg-transparent"
              )}
            >
              {item.status}
            </span>
          </div>

          {/* Secondary Badges (Date & Rating) */}
          <div className="flex flex-row flex-wrap items-center gap-2 w-full">
            <span className={cn(badgeBase, "bg-[#3F3F46] text-[#FAFAFA]")}>
              <Calendar size={12} />
              {item.date}
            </span>
            <span className={cn(badgeBase, "bg-[#3F3F46] text-[#FAFAFA]")}>
              <Star size={12} />
              {item.rating}
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-row flex-wrap items-start content-start gap-2 w-full">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  badgeBase,
                  "bg-white/5 border border-[#3F3F46] text-[#FAFAFA]"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex flex-row justify-end items-center gap-3 w-full mt-auto pt-2">
          {/* More IconButton */}
          <button
            type="button"
            onClick={() => onMore?.(item.id)}
            className="flex justify-center items-center w-6 h-6 bg-white/5 border border-[#3F3F46] rounded shadow-sm text-[#FAFAFA] hover:bg-white/10 transition-colors shrink-0"
          >
            <MoreHorizontal size={16} />
          </button>

          {/* Primary Button */}
          <button
            type="button"
            onClick={() => onViewDetails?.(item.id)}
            className="flex flex-row justify-center items-center px-2.5 py-1.5 gap-1.5 h-8 bg-[#FACC15] rounded-lg text-[#27272A] text-sm font-medium hover:bg-[#eab308] transition-colors"
          >
            <Maximize2 size={14} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
