import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, DropdownMenu } from "radix-ui";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CollectionView } from "@/features/collections/hooks";
import type { MediaItem, MediaStatus } from "@/features/library/types";
import { cn } from "@/lib/utils";
import { MediaCard } from "./MediaCard";

interface HomeSectionProps {
  title: string;
  count: number;
  items: MediaItem[];
  loading?: boolean;
  defaultOpen?: boolean;
  onQueryMore?: () => void;
  onChangeStatus?: (id: string, status: MediaStatus) => void;
  onRemoveStatus?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddToCollection?: (id: string) => void;
  onViewDetails?: (item: MediaItem) => void;
  collection?: CollectionView;
  onRenameCollection?: (id: string, name: string) => Promise<void> | void;
  onDeleteCollection?: (id: string) => Promise<void> | void;
  onChangePersonalRating?: (id: string, rating: number) => void;
  personalRatingPending?: boolean;
}

const HOME_PREVIEW_LIMIT = 3;

export function HomeSection({
  title,
  count,
  items,
  loading = false,
  defaultOpen = true,
  onQueryMore,
  onChangeStatus,
  onRemoveStatus,
  onDelete,
  onAddToCollection,
  onViewDetails,
  collection,
  onRenameCollection,
  onDeleteCollection,
  onChangePersonalRating,
  personalRatingPending = false,
}: HomeSectionProps) {
  const previewItems = items.slice(0, HOME_PREVIEW_LIMIT);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="flex w-full flex-col gap-6">
      {/* Header */}
      <div className="flex w-full flex-col items-start justify-between gap-4 lg:flex-row lg:items-center lg:gap-12">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[24px] font-medium leading-[29px] tracking-[-1px] text-[#D4D4D8]">
            {title}
          </h2>

          <span className="text-[16px] leading-[24px] text-[#A1A1AA]">
            {count} {count === 1 ? "Entry" : "Entries"}
          </span>

          {collection && onRenameCollection && onDeleteCollection ? (
            <CollectionActionsMenu
              collection={collection}
              onRename={onRenameCollection}
              onDelete={onDeleteCollection}
            />
          ) : null}
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto">
          {onQueryMore ? (
            <Button
              type="button"
              variant="surface"
              size="lg"
              onClick={onQueryMore}
              className="flex-1 sm:flex-none"
            >
              Query More
            </Button>
          ) : null}

          <Button
            type="button"
            variant="surface"
            size="icon-lg"
            aria-label="Toggle section"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <>
          {loading && (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#3F3F46] border-t-[#FAFAFA]" />
            </div>
          )}

          {!loading && previewItems.length === 0 && (
            <div className="py-8 text-sm text-[#A1A1AA]">No items found</div>
          )}

          {!loading && previewItems.length > 0 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3 2xl:gap-8">
              {previewItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onChangeStatus={onChangeStatus}
                  onRemoveStatus={onRemoveStatus}
                  onDelete={onDelete}
                  onAddToCollection={onAddToCollection}
                  onViewDetails={onViewDetails}
                  onChangePersonalRating={onChangePersonalRating}
                  personalRatingPending={personalRatingPending}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CollectionActionsMenu({
  collection,
  onRename,
  onDelete,
}: {
  collection: CollectionView;
  onRename: (id: string, name: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState(collection.name);
  const [pending, setPending] = useState(false);
  const nameInputId = `collection-name-${collection.id}`;

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === collection.name || pending) return;

    setPending(true);
    try {
      await onRename(collection.id, trimmedName);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      await onDelete(collection.id);
      setDeleteDialogOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) setName(collection.name);
        }}
      >
        <DropdownMenu.Trigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${collection.name} collection`}
            className="text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA] focus-visible:border-[#3F3F46] focus-visible:bg-[#27272A] focus-visible:ring-[#3F3F46]/50 aria-expanded:bg-[#27272A] aria-expanded:text-[#FAFAFA] data-[state=open]:bg-[#27272A] data-[state=open]:text-[#FAFAFA]"
          >
            <Pencil size={14} />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="z-50 w-[280px] rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-3 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.25),0px_4px_6px_-4px_rgba(0,0,0,0.2)]"
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <form className="flex flex-col gap-2" onSubmit={handleRename}>
              <label
                htmlFor={nameInputId}
                className="text-[12px] font-medium uppercase leading-4 tracking-[0.08em] text-[#71717A]"
              >
                Rename collection
              </label>
              <div className="flex gap-2">
                <input
                  id={nameInputId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-[6px] border border-[#3F3F46] bg-white/5 px-2 text-[14px] leading-5 text-[#FAFAFA] outline-none placeholder:text-[#A1A1AA] focus:border-[#71717A]"
                />
                <Button
                  type="submit"
                  variant="brand"
                  size="sm"
                  disabled={
                    !name.trim() || name.trim() === collection.name || pending
                  }
                >
                  Save
                </Button>
              </div>
            </form>

            <DropdownMenu.Separator className="my-3 h-px bg-[#3F3F46]" />

            <DropdownMenu.Item
              className={cn(
                "flex min-h-8 cursor-pointer select-none items-center gap-2 rounded-[6px] px-2 text-sm leading-5 text-[#F87171] outline-none transition-colors data-[highlighted]:bg-[#27272A]",
                pending && "pointer-events-none opacity-50"
              )}
              onSelect={(event) => {
                event.preventDefault();
                setOpen(false);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 size={16} />
              <span>Delete collection</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[240] bg-[#18181B]/[0.86] backdrop-blur-[8px]" />
          <AlertDialog.Content className="-translate-x-1/2 -translate-y-1/2 fixed left-1/2 top-1/2 z-[250] w-[calc(100vw-32px)] max-w-[420px] rounded-[12px] border border-[#3F3F46] bg-[#18181B] p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.25),0px_4px_6px_-4px_rgba(0,0,0,0.2)] outline-none">
            <AlertDialog.Title className="text-[18px] font-semibold leading-7 text-[#FAFAFA]">
              Delete collection?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-[14px] leading-5 text-[#A1A1AA]">
              Delete "{collection.name}"? Items stay in your library.
            </AlertDialog.Description>

            <div className="mt-6 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button type="button" variant="surface" size="lg">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  type="button"
                  variant="danger-surface"
                  size="lg"
                  disabled={pending}
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDelete();
                  }}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
