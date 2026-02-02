import { useState } from "react";
import { useSourceItems } from "@/hooks/useSourceItems";
import { useInboxFilters } from "@/hooks/useInboxFilters";
import { useSelection } from "@/hooks/useSelection";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { SourceItem } from "@/types";

// Sub-components
import {
  InboxHeader,
  InboxToolbar,
  InboxItemList,
  InboxEmptyState,
} from "./inbox";
import { BatchActions } from "./BatchActions";
import { SourceItemViewerDialog } from "./SourceItemViewerDialog";

/**
 * Main Inbox view component.
 * Orchestrates data fetching, filtering, selection, and user actions.
 *
 * Refactored to use extracted hooks and sub-components for maintainability.
 */
export function InboxView() {
  // Data fetching
  const {
    items,
    isLoading,
    extractingIds,
    refresh: refreshInbox,
    deleteItem,
    updateItemStatus,
  } = useSourceItems({ status: "inbox" });

  // Filtering & sorting
  const {
    filters,
    setSearchQuery,
    setFilterSourceType,
    setFilterResult,
    setSortBy,
    clearFilters,
    hasActiveFilters,
    groupedItems,
    sourceTypeCounts,
    visibleIds,
  } = useInboxFilters(items);

  // Selection
  const selection = useSelection(visibleIds);

  // Global store actions
  const refreshCounts = useAppStore((state) => state.refreshCounts);
  const batchDeleteInbox = useAppStore((state) => state.batchDeleteInbox);
  const { toast } = useToast();

  // Dialog state
  const [viewingItem, setViewingItem] = useState<SourceItem | null>(null);

  // ---------- Event Handlers ----------

  const handleSelectAllToggle = () => {
    if (selection.isAllSelected) {
      selection.clear();
    } else {
      selection.selectAll(visibleIds);
    }
  };

  const handleDelete = async (item: SourceItem) => {
    const result = await deleteItem(item.id);
    if (result.success) {
      refreshCounts();
    } else {
      console.error("Delete failed:", result.error);
    }
  };

  const handleArchive = async (item: SourceItem) => {
    const result = await updateItemStatus(item.id, "curated");
    if (result.success) {
      toast({
        title: "Saved to Library",
        description: "Item saved to Library.",
      });
      refreshCounts();
    } else {
      toast({
        title: "Save Failed",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleOpen = (item: SourceItem) => {
    setViewingItem(item);
  };

  // Batch actions
  const handleBatchDelete = async () => {
    const count = selection.selectedCount;
    const result = await batchDeleteInbox(Array.from(selection.selectedIds));
    if (result.success) {
      toast({
        title: "Batch Delete Successful",
        description: `Removed ${count} items.`,
      });
      refreshInbox();
    } else {
      toast({
        title: "Batch Delete Failed",
        description: result.error || "Error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleBatchArchive = async () => {
    const ids = Array.from(selection.selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const result = await window.api.sourceItems.update(id, {
          status: "curated",
        });
        if (!result.error) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast({
        title: "Saved to Library",
        description: `Saved ${successCount} items.`,
      });
    } else {
      toast({
        title: "Partial Save",
        description: `${successCount} saved, ${failCount} failed.`,
        variant: "destructive",
      });
    }

    selection.clear();
    refreshInbox();
    refreshCounts();
  };

  // ---------- Render ----------

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground animate-pulse">Loading inbox...</p>
      </div>
    );
  }

  const hasVisibleItems = groupedItems.length > 0;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden pb-4">
      <header className="flex-none mb-6 space-y-5">
        <InboxHeader totalCount={items.length} />
        <InboxToolbar
          searchQuery={filters.searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={filters.sortBy}
          onSortChange={setSortBy}
          filterSourceType={filters.filterSourceType}
          onSourceTypeChange={setFilterSourceType}
          filterResult={filters.filterResult}
          onResultChange={setFilterResult}
          sourceTypeCounts={sourceTypeCounts}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          isAllSelected={selection.isAllSelected}
          isAnySelected={selection.isAnySelected}
          onSelectAllToggle={handleSelectAllToggle}
        />
      </header>

      {hasVisibleItems ? (
        <InboxItemList
          groupedItems={groupedItems}
          selectedIds={selection.selectedIds}
          extractingIds={extractingIds}
          onToggleSelect={selection.toggle}
          onOpen={handleOpen}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      ) : (
        <InboxEmptyState
          hasItems={items.length > 0}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      )}

      <BatchActions
        selectedCount={selection.selectedCount}
        onDelete={handleBatchDelete}
        onArchive={handleBatchArchive}
        onClearSelection={selection.clear}
      />

      <SourceItemViewerDialog
        open={!!viewingItem}
        item={viewingItem}
        onClose={() => setViewingItem(null)}
      />
    </div>
  );
}
