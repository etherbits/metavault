import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import type { MediaStatus } from "@/features/library/types";
import { cn } from "@/lib/utils";

interface MediaCardMenuProps {
  selectMode?: boolean;
  currentStatus?: MediaStatus;
  onSelect?: () => void;
  onChangeStatus: (status: MediaStatus) => void;
  onAddToCollection?: () => void;
  onDelete?: () => void;
  onRemoveStatus?: () => void;
}

const statuses: MediaStatus[] = [
  "In Progress",
  "Planning",
  "Dropped",
  "On Hold",
  "Finished",
];

const menuContentClass =
  "z-50 flex w-44 flex-col gap-1 rounded-[8px] border border-[#3F3F46] bg-[#18181B] p-2 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]";

const menuItemClass =
  "flex min-h-8 cursor-pointer select-none items-center rounded-md px-2 text-sm leading-5 text-[#FAFAFA] outline-none transition-colors data-[highlighted]:bg-[#27272A] data-[disabled]:opacity-50";

export function MediaCardMenu({
  selectMode,
  currentStatus,
  onSelect,
  onChangeStatus,
  onAddToCollection,
  onDelete,
  onRemoveStatus,
}: MediaCardMenuProps) {
  return (
    <DropdownMenu.Root dir="rtl">
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          variant="surface"
          size="icon-xs"
          aria-label="Card actions"
          className="rounded-[4px]"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={8}
          className={menuContentClass}
          style={{ direction: "ltr" }}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenu.Item
            className={menuItemClass}
            onSelect={() => onSelect?.()}
            disabled={selectMode}
          >
            Select
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={cn(menuItemClass, "gap-2")}>
              <ChevronLeft size={16} className="text-[#A1A1AA]" />
              <span>Change status</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={8}
                collisionPadding={8}
                className={cn(menuContentClass, "mr-2")}
                style={{ direction: "ltr" }}
              >
                {statuses.map((status) => (
                  <DropdownMenu.Item
                    key={status}
                    className={cn(
                      menuItemClass,
                      currentStatus === status && "bg-[#27272A]"
                    )}
                    onSelect={() => onChangeStatus(status)}
                  >
                    {status}
                  </DropdownMenu.Item>
                ))}

                {onRemoveStatus && currentStatus ? (
                  <>
                    <DropdownMenu.Separator className="my-1 h-px bg-[#3F3F46]" />
                    <DropdownMenu.Item
                      className={cn(menuItemClass, "text-[#F87171]")}
                      onSelect={onRemoveStatus}
                    >
                      Remove status
                    </DropdownMenu.Item>
                  </>
                ) : null}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Item
            className={menuItemClass}
            onSelect={() => onAddToCollection?.()}
          >
            Add to collection
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-[#3F3F46]" />

          <DropdownMenu.Item
            className={cn(menuItemClass, "text-[#F87171]")}
            onSelect={() => onDelete?.()}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
