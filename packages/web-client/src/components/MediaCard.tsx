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
import { Popover } from "radix-ui";
import { StatusBadge } from "@/components/Badges";
import { MediaCardMenu } from "@/components/MediaCardMenu";
import { PersonalRatingControl } from "@/components/PersonalRatingControl";
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
  variant?: "default" | "compact";
  showActions?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEnterSelectMode?: (id: string) => void;
  onChangeStatus?: (id: string, status: MediaStatus) => void;
  onRemoveStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddToCollection?: (id: string) => void;
  onUploadImage?: (id: string) => void;
  onViewDetails?: (item: MediaItem) => void;
  onChangePersonalRating?: (id: string, rating: number) => void;
  personalRatingPending?: boolean;
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

function TagPill({ value, muted = false }: { value: string; muted?: boolean }) {
  return (
    <span
      title={value}
      className={cn(
        "inline-flex h-5 max-w-full items-center rounded-[8px] border border-[#3F3F46] bg-white/5 px-2 text-[12px] font-semibold leading-4 text-[#FAFAFA]",
        muted && "opacity-60"
      )}
    >
      <span className="truncate">{value}</span>
    </span>
  );
}

function MoreTagsPill({
  count,
  tags,
}: {
  count: number;
  tags: MediaItem["tags"];
}) {
  if (count <= 0) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-5 items-center rounded-[8px] border border-[#3F3F46] bg-[#3F3F46]/70 px-2 text-[12px] font-semibold leading-4 text-[#D4D4D8] transition-colors hover:bg-[#52525B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FACC16]"
          onClick={(event) => event.stopPropagation()}
        >
          +{count}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          side="bottom"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 max-h-[260px] w-[min(320px,calc(100vw-32px))] overflow-y-auto rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-3 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.25),0px_4px_6px_-4px_rgba(0,0,0,0.2)]"
          onClick={(event) => event.stopPropagation()}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <div className="flex flex-wrap gap-2">
            {sortTagsForDisplay(tags).map((tag) => (
              <TagPill
                key={tag.id}
                muted={tag.weight === "minor"}
                value={tag.value}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function sortTagsForDisplay(tags: MediaItem["tags"]) {
  return [
    ...tags.filter((tag) => tag.weight === "major"),
    ...tags.filter((tag) => tag.weight === "minor"),
  ];
}

export function MediaCard({
  item,
  variant = "default",
  showActions = true,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onEnterSelectMode,
  onChangeStatus,
  onRemoveStatus,
  onDelete,
  onAddToCollection,
  onUploadImage,
  onViewDetails,
  onChangePersonalRating,
  personalRatingPending = false,
}: MediaCardProps) {
  const posterSrc = item.posterUrl || "/image-placeholder.svg";
  const sortedTags = sortTagsForDisplay(item.tags);
  const majorTags = sortedTags.filter((tag) => tag.weight === "major");
  const minorTags = sortedTags.filter((tag) => tag.weight === "minor");
  const visibleMajorTags = majorTags.slice(0, 6);
  const visibleMinorTags = minorTags.slice(0, 3);
  const hiddenTagCount =
    majorTags.length -
    visibleMajorTags.length +
    minorTags.length -
    visibleMinorTags.length;
  const canEditLibraryFields = !item.id.startsWith("catalogue:");
  const canUseLibraryActions = showActions && canEditLibraryFields;
  const canEditPersonalRating =
    Boolean(onChangePersonalRating) && canEditLibraryFields;
  const compact = variant === "compact";

  function handleCardClick() {
    if (selectMode && canEditLibraryFields) {
      onToggleSelect?.(item.id);
    }
  }

  return (
    <Card
      data-media-card-id={item.id}
      className={cn(
        "relative h-full w-full overflow-visible rounded-[4px] border-none bg-[#27272A] py-0 text-white ring-0 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]",
        compact ? "min-h-[154px] sm:min-h-[214px]" : "min-h-[300px]",
        selected && "ring-2 ring-[#FACC16]"
      )}
      onClick={handleCardClick}
    >
      <div
        className={cn(
          "flex h-full min-w-0",
          compact ? "flex-row" : "flex-col sm:flex-row"
        )}
      >
        <div
          className={cn(
            "relative isolate aspect-[2/3] shrink-0 overflow-visible",
            compact
              ? "h-auto w-[38%] max-w-[96px] rounded-l-[4px] sm:max-w-[128px]"
              : "w-full rounded-t-[4px] sm:h-auto sm:w-[42%] sm:max-w-[200px] sm:rounded-l-[4px] sm:rounded-tr-none"
          )}
        >
          <img
            src={posterSrc}
            alt=""
            aria-hidden="true"
            width={400}
            height={600}
            decoding="async"
            className={cn(
              "pointer-events-none absolute inset-0 z-0 h-full w-full scale-105 object-cover opacity-25 blur-xl",
              compact
                ? "rounded-l-[4px]"
                : "rounded-t-[4px] sm:rounded-l-[4px] sm:rounded-tr-none"
            )}
          />
          <div
            className={cn(
              "relative z-10 h-full w-full overflow-hidden bg-[#27272A]",
              compact
                ? "rounded-l-[4px]"
                : "rounded-t-[4px] sm:rounded-l-[4px] sm:rounded-tr-none"
            )}
          >
            <img
              src={posterSrc}
              alt={item.title}
              width={400}
              height={600}
              decoding="async"
              className="block h-full w-full object-cover"
            />
          </div>
        </div>

        <CardContent
          className={cn(
            "flex w-full min-w-0 flex-1 flex-col px-4 py-3",
            compact
              ? "min-h-[154px] gap-2 sm:min-h-[214px]"
              : "min-h-[300px] gap-3"
          )}
        >
          <h3
            className={cn(
              "line-clamp-3 font-medium text-[#F4F4F5]",
              compact
                ? "text-[16px] leading-6 sm:text-[17px]"
                : "text-lg leading-7 sm:text-[20px]"
            )}
          >
            {item.title}
          </h3>

          <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3")}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#FACC16] px-2 text-[12px] font-semibold leading-4 text-[#FACC16]">
                {getTypeIcon(item.type)}
                {item.type}
              </span>

              {item.status && <StatusBadge status={item.status} />}
            </div>

            <div className="flex flex-col gap-2">
              <span className="inline-flex h-5 w-fit items-center gap-1 rounded-[8px] bg-[#3F3F46] px-2 text-[12px] font-semibold leading-4 text-[#FAFAFA]">
                <Calendar size={12} />
                {item.releasedAt}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-5 w-fit items-center gap-1 rounded-[8px] bg-[#3F3F46] px-2 text-[12px] font-semibold leading-4 text-[#FAFAFA]">
                  <Star size={12} />
                  {item.rating}
                </span>

                {canEditPersonalRating || item.personalRating !== null ? (
                  <span className="inline-flex h-5 w-fit items-center rounded-[8px] bg-[#3F3F46] px-2 text-[#FAFAFA]">
                    <PersonalRatingControl
                      value={item.personalRating}
                      size="sm"
                      ariaLabel={`Personal rating for ${item.title}`}
                      disabled={personalRatingPending}
                      onChange={
                        canEditPersonalRating
                          ? (rating) =>
                              onChangePersonalRating?.(item.id, rating)
                          : undefined
                      }
                    />
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "flex min-w-0 flex-wrap gap-2 overflow-hidden",
              compact && "hidden lg:flex"
            )}
          >
            {visibleMajorTags.map((tag) => (
              <TagPill key={tag.id} value={tag.value} />
            ))}
            {visibleMinorTags.map((tag) => (
              <TagPill key={tag.id} muted value={tag.value} />
            ))}
            <MoreTagsPill count={hiddenTagCount} tags={item.tags} />
          </div>

          {canUseLibraryActions ? (
            <div className="mt-auto flex flex-wrap items-center justify-end gap-3 pt-1">
              <MediaCardMenu
                selectMode={selectMode}
                currentStatus={item.status}
                onSelect={() => onEnterSelectMode?.(item.id)}
                onChangeStatus={(status) => onChangeStatus?.(item.id, status)}
                onAddToCollection={() => onAddToCollection?.(item.id)}
                onUploadImage={
                  onUploadImage ? () => onUploadImage(item.id) : undefined
                }
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
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}
