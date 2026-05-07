import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PaginationItem =
  | { type: "page"; value: number }
  | { type: "ellipsis"; id: string };

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  function getPages(): PaginationItem[] {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, idx) => ({
        type: "page" as const,
        value: idx + 1,
      }));
    }

    if (currentPage <= 4) {
      return [
        { type: "page", value: 1 },
        { type: "page", value: 2 },
        { type: "page", value: 3 },
        { type: "ellipsis", id: "right-gap" },
        { type: "page", value: totalPages },
      ];
    }

    if (currentPage >= totalPages - 3) {
      return [
        { type: "page", value: 1 },
        { type: "ellipsis", id: "left-gap" },
        { type: "page", value: totalPages - 2 },
        { type: "page", value: totalPages - 1 },
        { type: "page", value: totalPages },
      ];
    }

    return [
      { type: "page", value: 1 },
      { type: "ellipsis", id: "left-gap" },
      { type: "page", value: currentPage },
      { type: "ellipsis", id: "right-gap" },
      { type: "page", value: totalPages },
    ];
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

      {pages.map((page) =>
        page.type === "ellipsis" ? (
          <div
            key={page.id}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#27272A] text-[#F4F4F5]"
          >
            <MoreHorizontal size={20} />
          </div>
        ) : (
          <button
            key={page.value}
            type="button"
            onClick={() => onPageChange(page.value)}
            className={cn(
              "flex h-[30px] w-[30px] items-center justify-center rounded-[8px] text-[16px] leading-6",
              currentPage === page.value
                ? "bg-[#EAB308] text-[#27272A]"
                : "bg-[#27272A] text-[#F4F4F5]"
            )}
          >
            {page.value}
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
