import { useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';

export interface UseSelectionReturn {
  selectedIds: Set<string>;
  selectedCount: number;
  isAllSelected: boolean;
  isAnySelected: boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
}

/**
 * Hook wrapping inbox selection state from the app store.
 * Provides derived state for UI rendering (isAllSelected, isAnySelected).
 */
export function useSelection(visibleIds: string[]): UseSelectionReturn {
  const selectedIds = useAppStore((state) => state.selectedInboxItems);
  const toggleInboxSelection = useAppStore((state) => state.toggleInboxSelection);
  const selectAllInbox = useAppStore((state) => state.selectAllInbox);
  const clearInboxSelection = useAppStore((state) => state.clearInboxSelection);

  const isAllSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );

  const isAnySelected = useMemo(
    () => visibleIds.some((id) => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected,
    isAnySelected,
    toggle: toggleInboxSelection,
    selectAll: selectAllInbox,
    clear: clearInboxSelection,
  };
}
