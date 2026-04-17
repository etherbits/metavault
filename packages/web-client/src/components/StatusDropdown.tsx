import { cn } from "@/lib/utils";
import type { MediaStatus } from "./MediaCard";
interface StatusDropdownProps {
  currentStatus?: MediaStatus;
  onChangeStatus: (status: MediaStatus) => void;
  onAddToCollection?: () => void;
  onDelete?: () => void;
  onRemoveStatus?: () => void;
  className?: string;
}

const statuses: MediaStatus[] = [
  "In Progress",
  "Planning",
  "Dropped",
  "On Hold",
  "Finished",
];

export function StatusDropdown({
  currentStatus,
  onChangeStatus,
  onAddToCollection,
  onDelete,
  onRemoveStatus,
  className,
}: StatusDropdownProps) {
  return (
    <div
      className={cn(
        "bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl py-1 w-48 z-50",
        className
      )}
    >
      {/* Change status label */}
      <div className="px-3 py-1.5 text-[10px] font-semibold text-[#555] uppercase tracking-wider">
        Change status
      </div>

      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChangeStatus(status)}
          className={cn(
            "flex items-center w-full px-3 py-1.5 text-sm transition-colors text-left gap-2",
            currentStatus === status
              ? "text-white bg-[#222]"
              : "text-[#999] hover:text-white hover:bg-[#222]"
          )}
        >
          {status}
        </button>
      ))}

      <div className="border-t border-[#222] my-1" />

      <button
        type="button"
        onClick={onAddToCollection}
        className="flex items-center w-full px-3 py-1.5 text-sm text-[#999] hover:text-white hover:bg-[#222] transition-colors text-left"
      >
        Add to collection
      </button>

      <div className="border-t border-[#222] my-1" />

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center w-full px-3 py-1.5 text-sm text-[#e05555] hover:text-[#ff6b6b] hover:bg-[#2a1a1a] transition-colors text-left"
      >
        Delete
      </button>

      {onRemoveStatus && (
        <>
          <div className="border-t border-[#222] my-1" />
          <button
            type="button"
            onClick={onRemoveStatus}
            className="flex items-center w-full px-3 py-1.5 text-sm text-[#999] hover:text-white hover:bg-[#222] transition-colors text-left"
          >
            Remove status
          </button>
        </>
      )}
    </div>
  );
}
