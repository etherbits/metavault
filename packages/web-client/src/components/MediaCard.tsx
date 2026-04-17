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
}

const statusColors: Record<MediaStatus, string> = {
  "On Hold": "bg-[#1e3a5f] text-[#5b9bd5] border border-[#2a5080]",
  "In Progress": "bg-[#1e3d2f] text-[#4caf7d] border border-[#2a5540]",
  Planning: "bg-[#2d2a1e] text-[#c9a227] border border-[#4a3f10]",
  Dropped: "bg-[#3d1e1e] text-[#c94040] border border-[#552020]",
  Finished: "bg-[#1e2d3d] text-[#5b9bd5] border border-[#253a52]",
};

const typeStyle = "bg-[#1e1e1e] text-[#aaaaaa] border border-[#2a2a2a]";

export function MediaCard({ item, onViewDetails, onMore }: MediaCardProps) {
  return (
    <div className="flex bg-[#141414] rounded-xl border border-[#1f1f1f] overflow-hidden hover:border-[#2a2a2a] transition-colors group">
      {/* Poster */}
      <div className="w-[120px] shrink-0 bg-[#1a1a1a] relative overflow-hidden">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-[#1e1e1e] to-[#0a0a0a]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col gap-2 min-w-0">
        <h3 className="text-white font-semibold text-sm truncate">
          {item.title}
        </h3>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              typeStyle
            )}
          >
            {item.type}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              statusColors[item.status] ?? statusColors["On Hold"]
            )}
          >
            {item.status}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-[#666] text-xs">
          <Calendar size={11} />
          <span>{item.date}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 text-[#666] text-xs">
          <Star size={11} />
          <span>{item.rating}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-[#777] bg-[#1e1e1e] border border-[#252525] px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <button
            type="button"
            onClick={() => onMore?.(item.id)}
            className="text-[#555] hover:text-white transition-colors p-1"
          >
            <MoreHorizontal size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewDetails?.(item.id)}
            className="flex items-center gap-1.5 bg-[#F5B800] hover:bg-[#e0a900] text-black text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ml-auto"
          >
            <Maximize2 size={11} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
