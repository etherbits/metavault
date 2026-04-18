import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaStatus } from "./MediaCard";

interface StatusDropdownProps {
  onSelect?: () => void;
  selectMode?: boolean;
  currentStatus?: MediaStatus;
  onChangeStatus: (status: MediaStatus) => void;
  onAddToCollection?: () => void;
  onDelete?: () => void;
  onRemoveStatus?: () => void;
  submenuSide?: "left" | "right";
  className?: string;
  style?: CSSProperties;
}

const statuses: MediaStatus[] = [
  "In Progress",
  "Planning",
  "Dropped",
  "Finished",
];

export function StatusDropdown({
  onSelect,
  selectMode = false,
  currentStatus,
  onChangeStatus,
  onAddToCollection,
  onDelete,
  onRemoveStatus,
  submenuSide = "left",
  className,
  style,
}: StatusDropdownProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <div className={cn("relative", className)} style={style}>
      {showStatusMenu && (
        <div
          className={cn(
            "absolute top-0 z-[121] flex w-44 flex-col gap-2 rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]",
            submenuSide === "left" ? "right-full mr-3" : "left-full ml-3"
          )}
        >
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onChangeStatus(status);
                setShowStatusMenu(false);
              }}
              className={cn(
                "flex min-h-8 w-40 items-center rounded-md px-2 py-[5.5px] text-left text-sm leading-5 transition-colors",
                currentStatus === status
                  ? "bg-[#27272A] text-[#FAFAFA]"
                  : "text-[#FAFAFA] hover:bg-[#27272A]"
              )}
            >
              {status}
            </button>
          ))}

          {onRemoveStatus && (
            <>
              <div className="h-px w-40 bg-[#3F3F46]" />
              <button
                type="button"
                onClick={() => {
                  onRemoveStatus();
                  setShowStatusMenu(false);
                }}
                className="flex min-h-8 w-40 items-center rounded-md px-2 py-[5.5px] text-left text-sm leading-5 text-[#F87171] transition-colors hover:bg-[#27272A]"
              >
                Remove status
              </button>
            </>
          )}
        </div>
      )}

      <div className="z-[120] flex h-[177px] w-44 flex-col gap-2 rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex min-h-8 w-40 items-center rounded-md px-2 py-[5.5px] text-left text-sm leading-5 transition-colors",
            selectMode ? "text-[#FAFAFA]" : "text-[#FAFAFA] hover:bg-[#27272A]"
          )}
        >
          Select
        </button>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowStatusMenu((prev) => !prev)}
            className="flex min-h-8 w-40 items-center gap-2 rounded-md bg-[#18181b] px-2 py-[5.5px] text-left text-sm leading-5 text-[#FAFAFA] transition-colors hover:bg-[#27272A]"
          >
            {submenuSide === "left" ? (
              <ChevronLeft size={16} className="shrink-0 text-[#A1A1AA]" />
            ) : (
              <ChevronRight size={16} className="shrink-0 text-[#A1A1AA]" />
            )}
            <span className="truncate">Change status</span>
          </button>

          <button
            type="button"
            onClick={onAddToCollection}
            className="flex min-h-8 w-40 items-center rounded-md px-2 py-[5.5px] text-left text-sm leading-5 text-[#FAFAFA] transition-colors hover:bg-[#27272A]"
          >
            Add to collection
          </button>

          <div className="h-px w-40 bg-[#3F3F46]" />

          <button
            type="button"
            onClick={onDelete}
            className="flex min-h-8 w-40 items-center rounded-md px-2 py-[5.5px] text-left text-sm leading-5 text-[#F87171] transition-colors hover:bg-[#27272A]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
