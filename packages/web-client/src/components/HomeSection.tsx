import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MediaItem, MediaStatus } from "@/features/library/types";
import { MediaCard } from "./MediaCard";

interface HomeSectionProps {
  title: string;
  count: number;
  items: MediaItem[];
  loading?: boolean;
  defaultOpen?: boolean;
  onQueryMore?: () => void;
  onChangeStatus?: (id: string, status: MediaStatus) => void;
  onRemoveStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddToCollection?: (id: string) => void;
  onViewDetails?: (item: MediaItem) => void;
}

const HOME_PREVIEW_LIMIT = 3;

export function HomeSection({
  title,
  count,
  items,
  loading = false,
  defaultOpen = true,
  onQueryMore,
  onChangeStatus,
  onRemoveStatus,
  onDelete,
  onAddToCollection,
  onViewDetails,
}: HomeSectionProps) {
  const previewItems = items.slice(0, HOME_PREVIEW_LIMIT);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex w-full flex-col items-start justify-between gap-4 lg:flex-row lg:items-center lg:gap-12">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-medium leading-[29px] tracking-[-1px] text-[#D4D4D8]">
            {title}
          </h2>

          <span className="text-[16px] leading-[24px] text-[#A1A1AA]">
            {count} {count === 1 ? "Entry" : "Entries"}
          </span>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          {onQueryMore ? (
            <Button
              type="button"
              variant="surface"
              size="lg"
              onClick={onQueryMore}
              className="flex-1 sm:flex-none"
            >
              Query More
            </Button>
          ) : null}

          <Button
            type="button"
            variant="surface"
            size="icon-lg"
            aria-label="Toggle section"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <>
          {loading && (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#3F3F46] border-t-[#FAFAFA]" />
            </div>
          )}

          {!loading && previewItems.length === 0 && (
            <div className="py-8 text-sm text-[#A1A1AA]">No items found</div>
          )}

          {!loading && previewItems.length > 0 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3 2xl:gap-8">
              {previewItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onChangeStatus={onChangeStatus}
                  onRemoveStatus={onRemoveStatus}
                  onDelete={onDelete}
                  onAddToCollection={onAddToCollection}
                  onViewDetails={onViewDetails}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
