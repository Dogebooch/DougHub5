import { useEffect, useState, useMemo } from 'react';
import { 
  isToday, 
  isYesterday, 
  parseISO 
} from 'date-fns';
import { Search, SortDesc, Inbox } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from "@/components/ui/checkbox";
import { SourceItemRow } from "./SourceItemRow";
import { BatchActions } from "./BatchActions";
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

  const clearFilters = () => {
    setSearchQuery("");
    setFilterSourceType("all");
  };

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
    console.log("Add to Notebook placeholder:", item.id);
    // Task 39.4 will implement this logic
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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header with sticky behavior */}
      <header className="flex-none p-4 border-b space-y-4 bg-background z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Inbox Triage</h1>
          </div>
          <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {items.length} total
          </span>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label
              htmlFor="search"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Search Title
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Find a source..."
                className="pl-9 bg-muted/50 border-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Source Type
            </Label>
            <Select
              value={filterSourceType}
              onValueChange={(v) =>
                setFilterSourceType(v as SourceType | "all")
              }
            >
              <SelectTrigger className="w-[140px] bg-muted/50 border-none h-10">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="qbank">QBank</SelectItem>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="quickcapture">Quick Capture</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[200px]">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <SortDesc className="h-3 w-3" /> Sort Order
            </Label>
            <RadioGroup
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOrder)}
              className="flex items-center gap-4 bg-muted/50 h-10 px-3 rounded-md border-none"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="newest" id="newest" />
                <Label
                  htmlFor="newest"
                  className="text-sm cursor-pointer whitespace-nowrap"
                >
                  Newest
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="oldest" id="oldest" />
                <Label
                  htmlFor="oldest"
                  className="text-sm cursor-pointer whitespace-nowrap"
                >
                  Oldest
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2 h-10 self-end ml-auto px-1">
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
            />
            <Label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer whitespace-nowrap"
            >
              Select Visible
            </Label>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-4 pt-2 pb-24">
          {groupedItems.length > 0 ? (
            <div className="space-y-8">
              {groupedItems.map((group) => (
                <section key={group.title} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                      {group.title}
                    </h3>
                    <div className="h-[1px] flex-1 bg-border/50" />
                  </div>
                  <div className="grid gap-1">
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
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-medium text-lg">No items in inbox</h3>
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
        onAddToNotebook={() => console.log("Batch Add to Notebook")}
        onDelete={handleBatchDelete}
        onClearSelection={clearInboxSelection}
      />
    </div>
  );
}
