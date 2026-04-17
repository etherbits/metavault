import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { MediaCard, type MediaItem } from "./MediaCard";

interface HomeSectionProps {
  title: string;
  count: number;
  items: MediaItem[];
  onQueryMore?: () => void;
  defaultOpen?: boolean;
}

export function HomeSection({
  title,
  count,
  items,
  onQueryMore,
  defaultOpen = true,
}: HomeSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-semibold text-base">{title}</h2>
          <span className="text-[#555] text-sm">{count} Entries</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onQueryMore}
            className="text-xs text-[#888] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#141414] hover:bg-[#1a1a1a] px-3 py-1.5 rounded-md transition-colors"
          >
            Query More
          </button>
          <button
            type="button"
            onClick={() => setIsOpen((p) => !p)}
            className="text-[#555] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#141414] p-1.5 rounded-md transition-colors"
          >
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Items grid */}
      {isOpen && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Collapsed or empty state */}
      {isOpen && items.length === 0 && (
        <div className="text-[#444] text-sm py-4 text-center border border-dashed border-[#222] rounded-lg">
          No entries yet
        </div>
      )}
    </section>
  );
}
