import {
  BookOpen,
  Calendar,
  Clapperboard,
  FileText,
  Gamepad2,
  Maximize2,
  Star,
  Tv,
} from "lucide-react";
import { StatusBadge } from "@/components/Badges";
import { MediaCardMenu } from "@/components/MediaCardMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  MediaItem,
  MediaStatus,
  MediaType,
} from "@/features/library/types";
import { cn } from "@/lib/utils";

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
  onViewDetails?: (item: MediaItem) => void;
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
  onViewDetails,
}: MediaCardProps) {
  const posterSrc = item.posterUrl || "/images.jpeg";

  function handleCardClick() {
    if (selectMode) {
      onToggleSelect?.(item.id);
    }
  }

  return (
    <Card
      className={cn(
        "relative h-full min-h-[300px] w-full overflow-visible rounded-[4px] border-none bg-[#27272A] py-0 text-white ring-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]",
        selected && "ring-2 ring-[#FACC15]"
      )}
      onClick={handleCardClick}
    >
      <div className="flex h-full flex-col sm:flex-row">
        <div className="h-52 w-full shrink-0 overflow-hidden rounded-t-[4px] bg-black shadow-[4px_0px_16px_rgba(164,37,36,0.18)] sm:h-auto sm:w-[200px] sm:rounded-l-[4px] sm:rounded-tr-none">
          <img
            src={posterSrc}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        </div>

        <CardContent className="flex h-full w-full min-w-0 flex-1 flex-col gap-4 px-4 py-3">
          <h3 className="line-clamp-2 text-lg font-medium leading-7 text-[#F4F4F5] sm:text-[20px]">
            {item.title}
          </h3>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#FACC15] px-2 text-[12px] font-semibold leading-4 text-[#FACC15]">
                {getTypeIcon(item.type)}
                {item.type}
              </span>

              {item.status && <StatusBadge status={item.status} />}
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
            <MediaCardMenu
              selectMode={selectMode}
              currentStatus={item.status}
              onSelect={() => onEnterSelectMode?.(item.id)}
              onChangeStatus={(status) => onChangeStatus?.(item.id, status)}
              onAddToCollection={() => onAddToCollection?.(item.id)}
              onDelete={() => onDelete?.(item.id)}
              onRemoveStatus={() => onRemoveStatus?.(item.id)}
            />

            <Button
              type="button"
              variant="brand"
              onClick={(event) => {
                event.stopPropagation();
                onViewDetails?.(item);
              }}
              className="rounded-[8px] px-[10px] text-[14px] leading-5"
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
