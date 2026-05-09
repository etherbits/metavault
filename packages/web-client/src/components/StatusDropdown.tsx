import { useRef, useState, type CSSProperties } from "react";
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
  submenuDirection?: "down" | "up";
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
  submenuDirection = "down",
  className,
  style,
}: StatusDropdownProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [resolvedSubmenuDirection, setResolvedSubmenuDirection] = useState<
    "down" | "up"
  >(submenuDirection);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const baseItemClass =
    "flex min-h-8 w-40 items-center rounded-md px-2 py-[5.5px] text-left text-sm leading-5 transition-colors";

  function toggleStatusMenu() {
    if (!showStatusMenu) {
      const panelRect = panelRef.current?.getBoundingClientRect();
      if (panelRect) {
        const submenuTopOffset = 48;
        const estimatedSubmenuHeight = 192;
        const viewportPadding = 8;
        const canOpenDown =
          panelRect.top + submenuTopOffset + estimatedSubmenuHeight <=
          window.innerHeight - viewportPadding;
        const canOpenUp =
          panelRect.top + submenuTopOffset - estimatedSubmenuHeight >=
          viewportPadding;

        if (submenuDirection === "up" && canOpenUp) {
          setResolvedSubmenuDirection("up");
        } else if (submenuDirection === "down" && canOpenDown) {
          setResolvedSubmenuDirection("down");
        } else {
          setResolvedSubmenuDirection(canOpenDown ? "down" : "up");
        }
      } else {
        setResolvedSubmenuDirection(submenuDirection);
      }
    }

    setShowStatusMenu((prev) => !prev);
  }

  return (
    <div className={cn("relative", className)} style={style}>
      {showStatusMenu && (
        <div
          className={cn(
            "absolute z-[121] flex w-44 flex-col gap-2 rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]",
            resolvedSubmenuDirection === "down" ? "top-12" : "bottom-12",
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

      <div className="z-[120] flex w-44 flex-col gap-2 rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
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

        <button
          type="button"
          onClick={toggleStatusMenu}
          aria-expanded={showStatusMenu}
          aria-label="Change status"
          className={cn(
            baseItemClass,
            "gap-2 text-[#FAFAFA]",
            showStatusMenu ? "bg-[#27272A]" : "hover:bg-[#27272A]"
          )}
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
          aria-label="Add to collection"
          className={cn(baseItemClass, "text-[#FAFAFA] hover:bg-[#27272A]")}
        >
          Add to collection
        </button>

        <div className="h-px w-40 bg-[#3F3F46]" />

        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete card"
          className={cn(baseItemClass, "text-[#F87171] hover:bg-[#27272A]")}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
