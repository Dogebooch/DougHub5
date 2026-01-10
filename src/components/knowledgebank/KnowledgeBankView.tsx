import { useState, useEffect, useMemo, useCallback } from 'react';
import { Database, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { SourceItem } from '@/types';
import { SourceItemRow } from './SourceItemRow';
import { StatusGroup } from './StatusGroup';
import { BatchActions } from './BatchActions';
import { AddToNotebookDialog } from './AddToNotebookDialog';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const KnowledgeBankView = () => {
  const {
    selectedItemId,
    setCurrentView,
    selectedInboxItems,
    toggleInboxSelection,
    clearInboxSelection,
    batchDeleteInbox,
  } = useAppStore();

  const [items, setItems] = useState<SourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState({
    inbox: true,
    processed: false,
    curated: false,
  });

  // Handle auto-expansion and highlighting when deep linked
  useEffect(() => {
    if (selectedItemId && items.length > 0) {
      const item = items.find((i) => i.id === selectedItemId);
      if (item) {
        // Expand the correct group
        setExpandedGroups((prev) => ({
          ...prev,
          [item.status]: true,
        }));

        // Clear selection after a short delay to allow visual feedback
        const timer = setTimeout(() => {
          setCurrentView("knowledgebank", null);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [selectedItemId, items, setCurrentView]);

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [targetItemIds, setTargetItemIds] = useState<string[]>([]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    const result = await window.api.sourceItems.getAll();
    if (result.data) {
      setItems(result.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleGroup = (group: keyof typeof expandedGroups) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // Memoize source type counts for dropdown
  const sourceTypeCounts = useMemo(
    () => ({
      qbank: items.filter((i) => i.sourceType === "qbank").length,
      article: items.filter((i) => i.sourceType === "article").length,
      pdf: items.filter((i) => i.sourceType === "pdf").length,
      image: items.filter((i) => i.sourceType === "image").length,
      audio: items.filter((i) => i.sourceType === "audio").length,
      quickcapture: items.filter((i) => i.sourceType === "quickcapture").length,
      manual: items.filter((i) => i.sourceType === "manual").length,
    }),
    [items]
  );

  // Group and sort items
  const { inboxItems, processedItems, curatedItems } = useMemo(() => {
    const filteredItems = sourceTypeFilter
      ? items.filter((i) => i.sourceType === sourceTypeFilter)
      : items;

    const sorted = [...filteredItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return {
      inboxItems: sorted.filter((i) => i.status === "inbox"),
      processedItems: sorted.filter((i) => i.status === "processed"),
      curatedItems: sorted.filter((i) => i.status === "curated"),
    };
  }, [items, sourceTypeFilter]);

  const handleDelete = async (id: string) => {
    const result = await window.api.sourceItems.delete(id);
    if (!result.error) {
      fetchItems();
    }
  };

  const handleBatchDelete = async () => {
    await batchDeleteInbox(Array.from(selectedInboxItems));
    fetchItems();
  };

  const handleViewInNotebook = async (item: SourceItem) => {
    try {
      const result = await window.api.notebookBlocks.getBySourceId(item.id);
      if (result.data) {
        setCurrentView("notebook", result.data.notebookTopicPageId);
      } else {
        console.warn("Item is curated but no notebook block found");
        // Fallback or alert user
      }
    } catch (error) {
      console.error("Failed to find notebook block:", error);
    }
  };

  const openAddDialog = (ids: string[]) => {
    setTargetItemIds(ids);
    setIsAddDialogOpen(true);
  };

  const handleAddSuccess = () => {
    fetchItems();
    // clearInboxSelection is handled by store but good to ensure local sync if needed
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Loading Knowledge Bank...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <Database className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Knowledge Bank is empty</h2>
          <p className="text-muted-foreground max-w-sm">
            Capture content from articles or quick capture to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Bank</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground italic">
              Filter by type:
            </span>
            <Select
              value={sourceTypeFilter || "all"}
              onValueChange={(val) =>
                setSourceTypeFilter(val === "all" ? null : val)
              }
            >
              <SelectTrigger className="w-[160px] h-9 bg-card">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types ({items.length})</SelectItem>
                <SelectItem value="qbank">
                  QBank ({sourceTypeCounts.qbank})
                </SelectItem>
                <SelectItem value="article">
                  Article ({sourceTypeCounts.article})
                </SelectItem>
                <SelectItem value="pdf">
                  PDF ({sourceTypeCounts.pdf})
                </SelectItem>
                <SelectItem value="image">
                  Image ({sourceTypeCounts.image})
                </SelectItem>
                <SelectItem value="audio">
                  Audio ({sourceTypeCounts.audio})
                </SelectItem>
                <SelectItem value="quickcapture">
                  Quick Capture ({sourceTypeCounts.quickcapture})
                </SelectItem>
                <SelectItem value="manual">
                  Manual ({sourceTypeCounts.manual})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
            {items.length} items total
          </Badge>
        </div>
      </div>

      <div className="space-y-1 rounded-md border shadow-sm overflow-hidden bg-card min-w-0 w-full">
        {/* Inbox Group */}
        <StatusGroup
          title="Inbox"
          status="inbox"
          count={inboxItems.length}
          isExpanded={expandedGroups.inbox}
          onToggle={() => toggleGroup("inbox")}
        >
          {inboxItems.length > 0 ? (
            inboxItems.map((sItem) => (
              <SourceItemRow
                key={sItem.id}
                sourceItem={sItem}
                isSelected={selectedInboxItems.has(sItem.id)}
                isHighlighted={selectedItemId === sItem.id}
                onToggleSelect={(id) => toggleInboxSelection(id)}
                onAddToNotebook={(it) => openAddDialog([it.id])}
                onOpen={(it) => console.log("Open:", it.id)}
                onDelete={(it) => handleDelete(it.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground italic">
              No items in inbox.
            </div>
          )}
        </StatusGroup>

        {/* Processed Group */}
        <StatusGroup
          title="Processed"
          status="processed"
          count={processedItems.length}
          isExpanded={expandedGroups.processed}
          onToggle={() => toggleGroup("processed")}
        >
          {processedItems.length > 0 ? (
            processedItems.map((sItem) => (
              <SourceItemRow
                key={sItem.id}
                sourceItem={sItem}
                isSelected={selectedInboxItems.has(sItem.id)}
                isHighlighted={selectedItemId === sItem.id}
                onToggleSelect={(id) => toggleInboxSelection(id)}
                onAddToNotebook={(it) => openAddDialog([it.id])}
                onOpen={(it) => console.log("Open:", it.id)}
                onDelete={(it) => handleDelete(it.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground italic">
              No processed items.
            </div>
          )}
        </StatusGroup>

        {/* Curated Group */}
        <StatusGroup
          title="Curated"
          status="curated"
          count={curatedItems.length}
          isExpanded={expandedGroups.curated}
          onToggle={() => toggleGroup("curated")}
        >
          {curatedItems.length > 0 ? (
            curatedItems.map((sItem) => (
              <SourceItemRow
                key={sItem.id}
                sourceItem={sItem}
                isSelected={selectedInboxItems.has(sItem.id)}
                isHighlighted={selectedItemId === sItem.id}
                onToggleSelect={(id) => toggleInboxSelection(id)}
                onAddToNotebook={(it) => openAddDialog([it.id])}
                onViewInNotebook={handleViewInNotebook}
                onOpen={(it) => console.log("Open:", it.id)}
                onDelete={(it) => handleDelete(it.id)}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground italic">
              No curated items yet.
            </div>
          )}
        </StatusGroup>
      </div>

      {/* Dialogs & Batch Actions */}
      <AddToNotebookDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        itemIds={targetItemIds}
        onSuccess={handleAddSuccess}
      />

      <BatchActions
        selectedCount={selectedInboxItems.size}
        onAddToNotebook={() => openAddDialog(Array.from(selectedInboxItems))}
        onDelete={handleBatchDelete}
        onClearSelection={clearInboxSelection}
      />
    </div>
  );
};
