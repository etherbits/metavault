import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { MediaCard, type MediaItem } from "./MediaCard";

interface HomeSectionProps {
  title: string;
  count: number;
  items: MediaItem[];
  loading?: boolean;
  defaultOpen?: boolean;
  onQueryMore?: () => void;
}

export function HomeSection({
  title,
  count,
  items,
  loading = false,
  defaultOpen = true,
  onQueryMore,
}: HomeSectionProps) {
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
          <button
            type="button"
            onClick={onQueryMore}
            className="flex h-[36px] min-h-[36px] flex-1 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-[14px] font-medium leading-5 text-[#FAFAFA] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-white/10 sm:flex-none"
          >
            Query More
          </button>

          <button
            type="button"
            aria-label="Toggle section"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-[36px] w-[36px] min-h-[36px] min-w-[36px] items-center justify-center rounded-[8px] border border-[#3F3F46] bg-white/5 text-[#FAFAFA] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-white/10"
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
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

          {!loading && items.length === 0 && (
            <div className="py-8 text-sm text-[#A1A1AA]">No items found</div>
          )}

          {!loading && items.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 xl:grid-cols-3">
              {items.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
