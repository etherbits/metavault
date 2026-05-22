import { useEffect, useState } from "react";
import type { MediaItem } from "@/features/library/types";

export function useLibrarySelection(visibleItems: MediaItem[]) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    setSelectedIds((previousIds) =>
      previousIds.filter((id) => visibleIds.has(id))
    );
  }, [visibleItems]);

  const resolveActionIds = (cardId: string): string[] => {
    if (selectMode && selectedIds.length > 0) return selectedIds;
    return [cardId];
  };

  const clearSelection = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

  const enterSelectMode = (cardId: string) => {
    setSelectMode(true);
    setSelectedIds((previousIds) =>
      previousIds.includes(cardId) ? previousIds : [...previousIds, cardId]
    );
  };

  const toggleCardSelection = (cardId: string) => {
    if (!selectMode) return;
    setSelectedIds((previousIds) =>
      previousIds.includes(cardId)
        ? previousIds.filter((id) => id !== cardId)
        : [...previousIds, cardId]
    );
  };

  return {
    clearSelection,
    enterSelectMode,
    resolveActionIds,
    selectedIds,
    selectMode,
    setSelectedIds,
    toggleCardSelection,
  };
}
