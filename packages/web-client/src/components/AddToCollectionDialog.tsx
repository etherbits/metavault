import { useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface AddToCollectionDialogProps {
  open: boolean;
  selectedCollection: string;
  collections: string[];
  onCollectionChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AddToCollectionDialog({
  open,
  selectedCollection,
  collections,
  onCollectionChange,
  onConfirm,
  onCancel,
}: AddToCollectionDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-[#18181B]/[0.86] px-4 backdrop-blur-[8px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
      aria-hidden="true"
    >
      <div
        className="w-full max-w-[480px] rounded-[12px] border border-[#3F3F46] bg-[#18181B] p-8 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-collection-title"
      >
        <h2
          id="add-to-collection-title"
          className="text-[20px] font-semibold leading-6 text-[#FAFAFA]"
        >
          Add content to collection
        </h2>

        <p className="mt-4 text-[14px] leading-5 text-[#A1A1AA]">
          Select the collection to move the content item(s)
        </p>

        <div className="relative mt-4">
          <select
            value={selectedCollection}
            onChange={(event) => onCollectionChange(event.target.value)}
            className="h-9 w-full appearance-none rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 pr-10 text-[14px] leading-5 text-[#FAFAFA] shadow-sm outline-none focus:border-[#52525B]"
          >
            {collections.map((collectionName) => (
              <option
                key={collectionName}
                value={collectionName}
                className="bg-[#18181B] text-[#FAFAFA]"
              >
                {collectionName}
              </option>
            ))}
          </select>

          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-[8px] bg-[#FACC15] px-3 text-[14px] font-medium text-[#09090B] hover:bg-[#eab308]"
          >
            Move
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-[14px] font-medium text-[#FAFAFA] hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
