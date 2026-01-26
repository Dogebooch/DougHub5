import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  isToday,
  isYesterday,
  parseISO
} from 'date-fns';
import { Search, Inbox } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { SourceItemRow } from "./SourceItemRow";
import { BatchActions } from "./BatchActions";
import { AddToNotebookWorkflow } from "../notebook/AddToNotebookWorkflow";
import { SourceItemViewerDialog } from "./SourceItemViewerDialog";
import { SourceItem, SourceType } from "@/types";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/hooks/use-toast";

type SortOrder = "newest" | "oldest";
type ResultFilter = "all" | "incorrect" | "correct";

export function InboxView() {
  const [items, setItems] = useState<SourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSourceType, setFilterSourceType] = useState<SourceType | "all">(
    "all"
  );
  const [filterResult, setFilterResult] = useState<ResultFilter>("all");
  const [sortBy, setSortBy] = useState<SortOrder>("newest");
  const [isLoading, setIsLoading] = useState(true);

  // Track items currently having AI metadata extracted
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<SourceItem | null>(null);
  const [viewingItem, setViewingItem] = useState<SourceItem | null>(null);

  const refreshCounts = useAppStore((state) => state.refreshCounts);
  const selectedInboxItems = useAppStore((state) => state.selectedInboxItems);
  const toggleInboxSelection = useAppStore(
    (state) => state.toggleInboxSelection
  );
  const selectAllInbox = useAppStore((state) => state.selectAllInbox);
  const clearInboxSelection = useAppStore((state) => state.clearInboxSelection);
  const batchDeleteInbox = useAppStore((state) => state.batchDeleteInbox);
  const { toast } = useToast();

  const fetchInbox = async () => {
    setIsLoading(true);
    try {
      const result = await window.api.sourceItems.getByStatus("inbox");
      if (result.data) {
        setItems(result.data);
      } else if (result.error) {
        console.error("Failed to fetch inbox:", result.error);
      }
    } catch (err) {
      console.error("Error fetching inbox items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.api?.sourceItems?.onNew) {
      const unsubscribe = window.api.sourceItems.onNew((item: SourceItem) => {
        if (item.status === "inbox") {
          setItems((prev) => {
            // Remove existing version if present, then add new one to top
            const filtered = prev.filter((i) => i.id !== item.id);
            return [item, ...filtered];
          });
        }
      });
      return unsubscribe;
    }
  }, []);

  // Listen for AI extraction status updates
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.api?.sourceItems?.onAIExtraction
    ) {
      const unsubscribe = window.api.sourceItems.onAIExtraction((payload) => {
        const { sourceItemId, status, metadata } = payload;

        if (status === "started") {
          // Add to extracting set
          setExtractingIds((prev) => new Set(prev).add(sourceItemId));
        } else {
          // Remove from extracting set (completed or failed)
          setExtractingIds((prev) => {
            const next = new Set(prev);
            next.delete(sourceItemId);
            return next;
          });

          // Update item with new metadata if extraction succeeded
          if (status === "completed" && metadata) {
            setItems((prev) =>
              prev.map((item) =>
                item.id === sourceItemId
                  ? { ...item, metadata: { ...item.metadata, ...metadata } }
                  : item
              )
            );
          }
        }
      });
      return unsubscribe;
    }
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterSourceType("all");
    setFilterResult("all");
  };

  // Helper to get wasCorrect from qbank items
  const getWasCorrect = (item: SourceItem): boolean | null => {
    if (item.sourceType !== "qbank") return null;
    try {
      const content = JSON.parse(item.rawContent);
      return content.wasCorrect ?? null;
    } catch {
      return null;
    }
  };

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

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch = item.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesType =
          filterSourceType === "all" || item.sourceType === filterSourceType;

        // Result filter (only applies to qbank items)
        let matchesResult = true;
        if (filterResult !== "all") {
          const wasCorrect = getWasCorrect(item);
          if (wasCorrect === null) {
            // Non-qbank items: hide when filtering by result
            matchesResult = false;
          } else {
            matchesResult = filterResult === "correct" ? wasCorrect : !wasCorrect;
          }
        }

        return matchesSearch && matchesType && matchesResult;
      })
      .sort((a, b) => {
        const dateA = parseISO(a.createdAt).getTime();
        const dateB = parseISO(b.createdAt).getTime();
        return sortBy === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [items, searchQuery, filterSourceType, filterResult, sortBy]);

  const visibleIds = useMemo(
    () => filteredAndSortedItems.map((i) => i.id),
    [filteredAndSortedItems]
  );
  const isAllVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedInboxItems.has(id));
  const isAnyVisibleSelected = visibleIds.some((id) =>
    selectedInboxItems.has(id)
  );

  const handleSelectAllToggle = () => {
    if (isAllVisibleSelected) {
      clearInboxSelection();
    } else {
      selectAllInbox(visibleIds);
    }
  };

  const handleBatchDelete = async () => {
    const count = selectedInboxItems.size;
    const result = await batchDeleteInbox(Array.from(selectedInboxItems));
    if (result.success) {
      toast({
        title: "Batch Delete Successful",
        description: `Permanently removed ${count} items from inbox.`,
      });
      fetchInbox();
    } else {
      toast({
        title: "Batch Delete Failed",
        description: result.error || "An error occurred during batch deletion.",
        variant: "destructive",
      });
    }
  };

  const handleBatchArchive = async () => {
    const ids = Array.from(selectedInboxItems);
    const count = ids.length;
    let successCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        const result = await window.api.sourceItems.update(id, { status: "curated" });
        if (!result.error) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast({
        title: "Saved to Library",
        description: `Saved ${successCount} items to Library.`,
      });
    } else {
      toast({
        title: "Partial Save to Library",
        description: `Saved ${successCount} items, ${failCount} failed.`,
        variant: "destructive",
      });
    }

    clearInboxSelection();
    fetchInbox();
    refreshCounts();
  };

  const groupedItems = useMemo(() => {
    const today: SourceItem[] = [];
    const yesterday: SourceItem[] = [];
    const earlier: SourceItem[] = [];

    filteredAndSortedItems.forEach((item) => {
      const date = parseISO(item.createdAt);
      if (isToday(date)) {
        today.push(item);
      } else if (isYesterday(date)) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    const groups = [
      { title: "Today", items: today },
      { title: "Yesterday", items: yesterday },
      { title: "Earlier", items: earlier },
    ];

    if (sortBy === "oldest") {
      return groups.reverse().filter((g) => g.items.length > 0);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [filteredAndSortedItems, sortBy]);

  const handleDelete = async (item: SourceItem) => {
    try {
      const result = await window.api.sourceItems.delete(item.id);
      if (!result.error) {
        fetchInbox();
        refreshCounts();
      } else {
        console.error("Delete failed:", result.error);
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const handleArchive = async (item: SourceItem) => {
    try {
      const result = await window.api.sourceItems.update(item.id, { status: "curated" });
      if (!result.error) {
        toast({
          title: "Saved to Library",
          description: "Item saved to Library.",
        });
        fetchInbox();
        refreshCounts();
      } else {
        toast({
          title: "Save Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error saving item to library:", err);
    }
  };

  const handleAddToNotebook = (item: SourceItem) => {
    setTargetItem(item);
    setIsAddDialogOpen(true);
  };

  const onAddSuccess = () => {
    fetchInbox();
    clearInboxSelection();
    setIsAddDialogOpen(false);
  };

  const handleOpen = (item: SourceItem) => {
    setViewingItem(item);
  };

  const handleArchiveToKB = async (item: SourceItem) => {
    try {
      const result = await window.api.sourceItems.update(item.id, { status: "curated" });
      if (!result.error) {
        toast({
          title: "Saved to Library",
          description: "Item has been reviewed and saved to your Library.",
        });
        setViewingItem(null);
        fetchInbox();
        refreshCounts();
      } else {
        toast({
          title: "Save Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error saving item to library:", err);
      toast({
        title: "Save Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleAddToNotebookFromViewer = (item: SourceItem) => {
    setViewingItem(null); // Close viewer first
    handleAddToNotebook(item); // Open add to notebook workflow
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground animate-pulse">Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden pb-4">
      {/* Header section with refined separation */}
      <header className="flex-none mb-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/10 flex items-center justify-center">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
                Initial Capture Queue
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-1 text-[11px]"
            >
              {items.length} TOTAL
            </Badge>
          </div>
        </div>

        <div className="bg-surface-elevated/30 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm space-y-3">
          {/* Row 1: Search + Order */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                id="search"
                placeholder="Filter by title..."
                className="pl-9 bg-background/50 border-border/10 ring-offset-background transition-all focus-visible:ring-1 focus-visible:ring-primary/30 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <RadioGroup
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOrder)}
              className="flex items-center gap-3"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="newest" id="newest" className="h-3.5 w-3.5" />
                <Label
                  htmlFor="newest"
                  className="text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  Newest
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="oldest" id="oldest" className="h-3.5 w-3.5" />
                <Label
                  htmlFor="oldest"
                  className="text-xs font-medium cursor-pointer whitespace-nowrap"
                >
                  Oldest
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Row 2: Filters + Select */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Source:</span>
              <Select
                value={filterSourceType}
                onValueChange={(v) =>
                  setFilterSourceType(v as SourceType | "all")
                }
              >
                <SelectTrigger className="w-[140px] bg-background/50 border-border/10 h-8 text-xs">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="qbank">QBank ({sourceTypeCounts.qbank})</SelectItem>
                  <SelectItem value="article">Article ({sourceTypeCounts.article})</SelectItem>
                  <SelectItem value="pdf">PDF ({sourceTypeCounts.pdf})</SelectItem>
                  <SelectItem value="image">Image ({sourceTypeCounts.image})</SelectItem>
                  <SelectItem value="audio">Audio ({sourceTypeCounts.audio})</SelectItem>
                  <SelectItem value="quickcapture">Quick Capture ({sourceTypeCounts.quickcapture})</SelectItem>
                  <SelectItem value="manual">Manual ({sourceTypeCounts.manual})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Result:</span>
              <Select
                value={filterResult}
                onValueChange={(v) => setFilterResult(v as ResultFilter)}
              >
                <SelectTrigger className="w-[130px] bg-background/50 border-border/10 h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="incorrect">Incorrect only</SelectItem>
                  <SelectItem value="correct">Correct only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || filterSourceType !== "all" || filterResult !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
              >
                Clear filters
              </Button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Checkbox
                id="select-all"
                checked={
                  isAllVisibleSelected
                    ? true
                    : isAnyVisibleSelected
                    ? "indeterminate"
                    : false
                }
                onCheckedChange={handleSelectAllToggle}
                className="border-muted-foreground/30 data-[state=checked]:bg-primary h-3.5 w-3.5"
              />
              <Label
                htmlFor="select-all"
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap transition-colors"
              >
                Select All
              </Label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <ScrollArea className="flex-1 min-w-0">
        <div className="p-4 pt-2 pb-24 min-w-0 w-full">
          {groupedItems.length > 0 ? (
            <div className="rounded-lg border shadow-sm overflow-hidden bg-card min-w-0 w-full">
              {groupedItems.map((group, index) => (
                <section
                  key={group.title}
                  className={index > 0 ? "border-t border-border/30" : ""}
                >
                  <div className="flex items-center gap-3 px-4 py-2 bg-card-muted/10">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-card-muted">
                      {group.title}
                    </h3>
                    <div className="h-[1px] flex-1 bg-border/50" />
                  </div>
                  <div className="divide-y divide-border/30">
                    {group.items.map((item) => (
                      <SourceItemRow
                        key={item.id}
                        sourceItem={item}
                        isSelected={selectedInboxItems.has(item.id)}
                        isExtracting={extractingIds.has(item.id)}
                        onToggleSelect={() => toggleInboxSelection(item.id)}
                        onOpen={handleOpen}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-surface-elevated flex items-center justify-center">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-lg text-foreground">
                  No items in inbox
                </h3>
                <p className="text-sm text-muted-foreground">
                  {items.length === 0
                    ? "Your inbox is empty. Start by capturing some medical content."
                    : "No items match your current search and filter criteria."}
                </p>
              </div>
              {(searchQuery || filterSourceType !== "all" || filterResult !== "all") && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <BatchActions
        selectedCount={selectedInboxItems.size}
        onDelete={handleBatchDelete}
        onArchive={handleBatchArchive}
        onClearSelection={clearInboxSelection}
      />

      <SourceItemViewerDialog
        open={!!viewingItem}
        item={viewingItem}
        onClose={() => setViewingItem(null)}
        onAddToNotebook={handleAddToNotebookFromViewer}
        onArchiveToKB={handleArchiveToKB}
      />

      <AddToNotebookWorkflow
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        sourceItem={targetItem}
        onSuccess={onAddSuccess}
      />
    </div>
  );
}
