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
  function getPages(): (number | "...")[] {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    return [1, 2, 3, "...", totalPages];
  }

  const pages = getPages();

  return (
    <div className="flex h-[30px] items-start gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#27272A] text-[#F4F4F5] disabled:opacity-40"
      >
        <ChevronLeft size={20} />
      </button>

      {pages.map((page, i) =>
        page === "..." ? (
          <div
            key={`ellipsis-${i}`}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#27272A] text-[#F4F4F5]"
          >
            <MoreHorizontal size={20} />
          </div>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page as number)}
            className={cn(
              "flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-[16px] leading-6",
              currentPage === page
                ? "bg-[#EAB308] text-[#27272A]"
                : "bg-[#27272A] text-[#F4F4F5]"
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
        className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#27272A] text-[#F4F4F5] disabled:opacity-40"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
