import { Calendar, Star, MoreHorizontal, Maximize2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  status: MediaStatus;
  date: string;
  rating: string;
  tags: string[];
  posterUrl?: string;
}

export function MediaCard({ item }: { item: MediaItem }) {
  return (
    <Card className="h-full min-h-[300px] w-full overflow-hidden rounded-[4px] border-none bg-[#27272A] py-0 text-white ring-0 sm:max-w-[420px]">
      <div className="flex h-full flex-col sm:flex-row">
        <div className="h-48 w-full shrink-0 bg-black sm:h-[300px] sm:w-[200px]">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <CardContent className="flex w-full flex-col gap-4 px-4 py-3 sm:w-[220px]">
          <h3 className="truncate text-lg text-[#F4F4F5] sm:text-[20px]">
            {item.title}
          </h3>

          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-yellow-400 px-2 text-xs text-yellow-400">
              {item.type}
            </span>
            <span className="rounded border border-blue-400 px-2 text-xs text-blue-400">
              {item.status}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="flex w-fit items-center gap-1 rounded bg-[#3F3F46] px-2 text-xs">
              <Calendar size={12} />
              {item.date}
            </span>

            <span className="flex w-fit items-center gap-1 rounded bg-[#3F3F46] px-2 text-xs">
              <Star size={12} />
              {item.rating}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-[#3F3F46] px-2 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="border-[#3F3F46] bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <MoreHorizontal size={14} />
            </Button>

            <Button
              type="button"
              className="gap-1 bg-[#FACC15] px-3 py-1 text-sm text-black hover:bg-[#eab308]"
            >
              <Maximize2 size={14} />
              View Details
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
