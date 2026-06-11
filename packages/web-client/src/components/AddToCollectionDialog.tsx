import { ChevronDown, Plus } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CollectionView } from "@/features/collections/hooks";
import { cn } from "@/lib/utils";

interface AddToCollectionDialogProps {
  open: boolean;
  selectedCollection: string;
  collections: CollectionView[];
  onCollectionChange: (value: string) => void;
  onConfirm: () => void;
  onCreateCollection?: (name: string) => Promise<void> | void;
  onCancel: () => void;
  isCreatingCollection?: boolean;
  createCollectionError?: string | null;
}

export function AddToCollectionDialog({
  open,
  selectedCollection,
  collections,
  onCollectionChange,
  onConfirm,
  onCreateCollection,
  onCancel,
  isCreatingCollection = false,
  createCollectionError = null,
}: AddToCollectionDialogProps) {
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

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

  useEffect(() => {
    if (!open) {
      setCreatingCollection(false);
      setNewCollectionName("");
    }
  }, [open]);

  if (!open) return null;

  const activeCollection = collections.find(
    (collection) => collection.id === selectedCollection
  );

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newCollectionName.trim();
    if (!name || !onCreateCollection) return;

    try {
      await onCreateCollection(name);
      setCreatingCollection(false);
      setNewCollectionName("");
    } catch (error) {
      console.error("Failed to create collection", error);
    }
  }

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

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="mt-4 flex h-9 w-full items-center justify-between rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-left text-[14px] leading-5 text-[#FAFAFA] shadow-sm outline-none transition-colors hover:bg-white/10 focus:border-[#52525B]"
            >
              <span className={cn(!activeCollection && "text-[#A1A1AA]")}>
                {activeCollection?.name ?? "Choose collection"}
              </span>
              <ChevronDown size={16} className="text-[#A1A1AA]" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              sideOffset={6}
              collisionPadding={12}
              className="z-[230] flex max-h-[280px] w-[var(--radix-dropdown-menu-trigger-width)] flex-col gap-1 overflow-y-auto rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-2 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.24),0px_4px_6px_-4px_rgba(0,0,0,0.2)]"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              {collections.map((collection) => (
                <DropdownMenu.Item
                  key={collection.id}
                  className={cn(
                    "flex min-h-8 cursor-pointer select-none items-center rounded-[6px] px-2 text-sm leading-5 text-[#FAFAFA] outline-none transition-colors data-[highlighted]:bg-[#27272A]",
                    collection.id === selectedCollection && "bg-[#27272A]"
                  )}
                  onSelect={() => onCollectionChange(collection.id)}
                >
                  {collection.name}
                </DropdownMenu.Item>
              ))}

              {collections.length > 0 && onCreateCollection ? (
                <DropdownMenu.Separator className="my-1 h-px bg-[#3F3F46]" />
              ) : null}

              {onCreateCollection ? (
                <DropdownMenu.Item
                  className="flex min-h-8 cursor-pointer select-none items-center gap-2 rounded-[6px] px-2 text-sm leading-5 text-[#FACC15] outline-none transition-colors data-[highlighted]:bg-[#27272A]"
                  onSelect={() => setCreatingCollection(true)}
                >
                  <Plus size={16} />
                  New collection
                </DropdownMenu.Item>
              ) : null}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {creatingCollection ? (
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={handleCreateCollection}
          >
            <input
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="Collection name"
              className="h-9 min-w-0 flex-1 rounded-[8px] border border-[#3F3F46] bg-white/5 px-3 text-[14px] leading-5 text-[#FAFAFA] outline-none placeholder:text-[#A1A1AA] focus:border-[#52525B]"
            />
            <Button
              type="submit"
              variant="brand"
              size="lg"
              disabled={!newCollectionName.trim() || isCreatingCollection}
            >
              {isCreatingCollection ? "Creating..." : "Create"}
            </Button>
          </form>
        ) : null}

        {createCollectionError ? (
          <p className="mt-3 text-[13px] leading-5 text-[#FCA5A5]">
            {createCollectionError}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="brand"
            size="lg"
            onClick={onConfirm}
            disabled={selectedCollection === ""}
          >
            Move
          </Button>

          <Button type="button" variant="surface" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
