import { useEffect, useState, useMemo } from 'react';
import { 
  isToday, 
  isYesterday, 
  parseISO 
} from 'date-fns';
import { Search, SortDesc, SortAsc, Inbox, Filter } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { SourceItemRow } from "./SourceItemRow";
import { BatchActions } from "./BatchActions";
import { AddToNotebookDialog } from "./AddToNotebookDialog";
import { SourceItem, SourceType } from "@/types";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/hooks/use-toast";

type SortOrder = "newest" | "oldest";

export function InboxView() {
  const [items, setItems] = useState<SourceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSourceType, setFilterSourceType] = useState<SourceType | "all">(
    "all"
  );
  const [sortBy, setSortBy] = useState<SortOrder>("newest");
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [targetItemIds, setTargetItemIds] = useState<string[]>([]);

  const refreshCounts = useAppStore((state) => state.refreshCounts);
  const selectedInboxItems = useAppStore((state) => state.selectedInboxItems);
  const toggleInboxSelection = useAppStore(
    (state) => state.toggleInboxSelection
  );
  const addToInboxSelection = useAppStore((state) => state.addToInboxSelection);
  const removeFromInboxSelection = useAppStore(
    (state) => state.removeFromInboxSelection
  );
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
      const unsubscribe = window.api.sourceItems.onNew((item: any) => {
        if (item.status === "inbox") {
          setItems((prev) => {
            // Check for duplicates in local state
            if (prev.find((i) => i.id === item.id)) return prev;
            return [item, ...prev];
          });
        }
      });
      return unsubscribe;
    }
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterSourceType("all");
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
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const dateA = parseISO(a.createdAt).getTime();
        const dateB = parseISO(b.createdAt).getTime();
        return sortBy === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [items, searchQuery, filterSourceType, sortBy]);

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
      removeFromInboxSelection(visibleIds);
    } else {
      addToInboxSelection(visibleIds);
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
      if (result.data) {
        fetchInbox();
        refreshCounts();
      } else if (result.error) {
        console.error("Delete failed:", result.error);
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const handleAddToNotebook = (item: SourceItem) => {
    setTargetItemIds([item.id]);
    setIsAddDialogOpen(true);
  };

  const handleBatchAddToNotebook = () => {
    setTargetItemIds(Array.from(selectedInboxItems));
    setIsAddDialogOpen(true);
  };

  const onAddSuccess = () => {
    fetchInbox();
    clearInboxSelection();
    setIsAddDialogOpen(false);
  };

  const handleOpen = (item: SourceItem) => {
    console.log("Open item placeholder:", item.id);
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground animate-pulse">Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-base overflow-hidden">
      {/* Header with sticky behavior */}
      <header className="flex-none px-4 py-3 border-b border-border/30 bg-surface-base z-10 sticky top-0">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full px-2 py-0 h-5 text-[10px] font-bold"
            >
              {items.length}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-grow sm:flex-grow-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search sources..."
                className="pl-9 h-9 bg-muted/30 border-none focus-visible:ring-1 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select
              value={filterSourceType}
              onValueChange={(v) =>
                setFilterSourceType(v as SourceType | "all")
              }
            >
              <SelectTrigger className="w-auto min-w-[120px] h-9 bg-muted/30 border-none px-3 gap-2 text-sm">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue>
                  {filterSourceType === "all"
                    ? "All Types"
                    : `${
                        filterSourceType.charAt(0).toUpperCase() +
                        filterSourceType.slice(1)
                      } (${sourceTypeCounts[filterSourceType]})`}
                </SelectValue>
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

            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 gap-2 text-muted-foreground hover:text-foreground"
              onClick={() =>
                setSortBy(sortBy === "newest" ? "oldest" : "newest")
              }
            >
              {sortBy === "newest" ? (
                <SortDesc className="h-4 w-4" />
              ) : (
                <SortAsc className="h-4 w-4" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wider">
                {sortBy}
              </span>
            </Button>

            <Separator
              orientation="vertical"
              className="h-4 mx-1 hidden sm:block"
            />

            <div className="flex items-center gap-2 pl-1">
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
                className="h-4 w-4"
              />
              <Label
                htmlFor="select-all"
                className="text-xs font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
              >
                Select {visibleIds.length}
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
                        onToggleSelect={() => toggleInboxSelection(item.id)}
                        onAddToNotebook={handleAddToNotebook}
                        onOpen={handleOpen}
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
              {(searchQuery || filterSourceType !== "all") && (
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
        onAddToNotebook={handleBatchAddToNotebook}
        onDelete={handleBatchDelete}
        onClearSelection={clearInboxSelection}
      />

      <AddToNotebookDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        itemIds={targetItemIds}
        onSuccess={onAddSuccess}
      />
    </div>
  );
}
