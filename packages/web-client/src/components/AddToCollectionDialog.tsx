import { Check, Folder, Plus, Search } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CollectionView } from "@/features/collections/hooks";
import { cn } from "@/lib/utils";

interface AddToCollectionDialogProps {
  open: boolean;
  targetIds: string[];
  collections: CollectionView[];
  onConfirm: (collectionIds: string[]) => void;
  onCreateCollection?: (name: string) => Promise<string | null> | string | null;
  onCancel: () => void;
  isSaving?: boolean;
  isCreatingCollection?: boolean;
  createCollectionError?: string | null;
}

export function AddToCollectionDialog({
  open,
  targetIds,
  collections,
  onConfirm,
  onCreateCollection,
  onCancel,
  isSaving = false,
  isCreatingCollection = false,
  createCollectionError = null,
}: AddToCollectionDialogProps) {
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    []
  );
  const [search, setSearch] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const initializedOpenStateRef = useRef(false);

  const targetIdSet = useMemo(() => new Set(targetIds), [targetIds]);
  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    if (!open) {
      initializedOpenStateRef.current = false;
      return;
    }

    if (initializedOpenStateRef.current) return;
    initializedOpenStateRef.current = true;

    const initiallySelected = collections
      .filter(
        (collection) =>
          targetIds.length > 0 &&
          targetIds.every((id) =>
            collection.entries.some((entry) => entry.library_entry_id === id)
          )
      )
      .map((collection) => collection.id);

    setSelectedCollectionIds(initiallySelected);
    setSearch("");
    setNewCollectionName("");
  }, [collections, open, targetIds]);

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

  const selectedCount = selectedCollectionIds.length;

  function toggleCollection(collectionId: string) {
    setSelectedCollectionIds((current) =>
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId]
    );
  }

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newCollectionName.trim();
    if (!name || !onCreateCollection) return;

    const createdId = await onCreateCollection(name);
    if (createdId) {
      setSelectedCollectionIds((current) =>
        current.includes(createdId) ? current : [...current, createdId]
      );
    }
    setNewCollectionName("");
    setSearch("");
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[#18181B]/[0.86] backdrop-blur-[8px]"
        aria-label="Close add to collections dialog"
        onClick={onCancel}
      />
      <div
        className="relative flex max-h-[min(640px,calc(100vh-32px))] w-full max-w-[520px] flex-col overflow-hidden rounded-[12px] border border-[#3F3F46] bg-[#18181B] shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-collection-title"
      >
        <div className="border-b border-[#27272A] p-6">
          <h2
            id="add-to-collection-title"
            className="text-[20px] font-semibold leading-6 text-[#FAFAFA]"
          >
            Add to collections
          </h2>

          <p className="mt-2 text-[14px] leading-5 text-[#A1A1AA]">
            Choose one or more collections for the selected item(s).
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-[#27272A] p-4">
            <label className="relative block">
              <Search
                size={16}
                className="-translate-y-1/2 pointer-events-none absolute left-3 top-1/2 text-[#A1A1AA]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search collections"
                className="h-9 w-full rounded-[8px] border border-[#3F3F46] bg-white/5 pl-9 pr-3 text-[14px] leading-5 text-[#FAFAFA] outline-none placeholder:text-[#A1A1AA] focus:border-[#71717A]"
              />
            </label>
          </div>

          <div className="min-h-[160px] flex-1 overflow-y-auto p-2">
            {filteredCollections.length > 0 ? (
              filteredCollections.map((collection) => {
                const selected = selectedCollectionIds.includes(collection.id);
                const alreadyContainsTargets =
                  targetIds.length > 0 &&
                  collection.entries.some((entry) =>
                    targetIdSet.has(entry.library_entry_id)
                  );

                return (
                  <button
                    key={collection.id}
                    type="button"
                    aria-label={collection.name}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[8px] px-3 py-2 text-left outline-none transition-colors hover:bg-[#27272A] focus-visible:bg-[#27272A]",
                      selected && "bg-[#27272A]"
                    )}
                    onClick={() => toggleCollection(collection.id)}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-[#52525B]",
                        selected &&
                          "border-[#FACC16] bg-[#FACC16] text-[#09090B]"
                      )}
                      aria-hidden="true"
                    >
                      {selected ? <Check size={14} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium leading-5 text-[#FAFAFA]">
                        {collection.name}
                      </span>
                      <span className="block text-[12px] leading-4 text-[#A1A1AA]">
                        {collection.entries.length}{" "}
                        {collection.entries.length === 1 ? "item" : "items"}
                        {alreadyContainsTargets ? " • already included" : ""}
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-8 text-center text-[14px] leading-5 text-[#A1A1AA]">
                No collections match your search.
              </p>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-[#27272A] p-4"
            onSubmit={handleCreateCollection}
          >
            <label className="relative min-w-0 flex-1">
              <Folder
                size={16}
                className="-translate-y-1/2 pointer-events-none absolute left-3 top-1/2 text-[#A1A1AA]"
              />
              <input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder="New collection name"
                className="h-9 w-full rounded-[8px] border border-[#3F3F46] bg-white/5 pl-9 pr-3 text-[14px] leading-5 text-[#FAFAFA] outline-none placeholder:text-[#A1A1AA] focus:border-[#71717A]"
              />
            </label>
            <Button
              type="submit"
              variant="surface"
              size="icon-lg"
              aria-label="Create collection"
              disabled={!newCollectionName.trim() || isCreatingCollection}
            >
              <Plus size={16} />
            </Button>
          </form>
        </div>

        {createCollectionError ? (
          <p className="border-t border-[#27272A] px-6 py-3 text-[13px] leading-5 text-[#FCA5A5]">
            {createCollectionError}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-[#27272A] p-4">
          <p className="text-[13px] leading-5 text-[#A1A1AA]">
            {selectedCount} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="surface"
              size="lg"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              size="lg"
              onClick={() => onConfirm(selectedCollectionIds)}
              disabled={targetIds.length === 0 || isSaving}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
