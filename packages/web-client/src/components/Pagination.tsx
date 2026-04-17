import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  // Generate page numbers to show
  function getPages(): (number | "...")[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    // Always show first 3
    pages.push(1, 2, 3);
    if (currentPage > 4 && currentPage < totalPages - 1) {
      pages.push("...", currentPage, "...");
    } else {
      pages.push("...");
    }
    pages.push(totalPages);
    return pages;
  }

  const pages = getPages();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1e1e1e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((page, i) =>
        page === "..." ? (
          <span
            // biome-ignore lint: ellipsis index ok here
            key={`ellipsis-${i}`}
            className="w-8 h-8 flex items-center justify-center text-[#555]"
          >
            <MoreHorizontal size={14} />
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page as number)}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors",
              currentPage === page
                ? "bg-[#F5B800] text-black font-bold"
                : "text-[#888] hover:text-white hover:bg-[#1e1e1e]"
            )}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[#555] hover:text-white hover:bg-[#1e1e1e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
