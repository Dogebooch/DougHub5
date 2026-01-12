import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, BookOpen, Loader2, Trash2 } from "lucide-react";
import { NotebookTopicPage, CanonicalTopic } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TopicPageListProps {
  pages: NotebookTopicPage[];
  topics: Map<string, CanonicalTopic>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPageCreated: () => void; // callback to refresh parent
  onPageDeleted?: (id: string) => void;
}

/**
 * TopicPageList
 *
 * Sidebar component showing the list of topic pages with search and creation UI.
 */
export const TopicPageList = ({
  pages,
  topics,
  selectedId,
  onSelect,
  onPageCreated,
  onPageDeleted,
}: TopicPageListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<NotebookTopicPage | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [suggestions, setSuggestions] = useState<CanonicalTopic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { deleteNotebookPage } = useAppStore();

  // Helper function to get topic name
  const getTopicName = useCallback(
    (page: NotebookTopicPage): string => {
      const topic = topics.get(page.canonicalTopicId);
      return topic?.canonicalName ?? "Unknown Topic";
    },
    [topics]
  );

  // Filtered pages based on search query
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    const query = searchQuery.toLowerCase();
    return pages.filter((page) =>
      getTopicName(page).toLowerCase().includes(query)
    );
  }, [getTopicName, pages, searchQuery]);

  // Topic suggestion logic for Dialog
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (newTopicName.length >= 2) {
      setIsSearching(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const result = await window.api.canonicalTopics.suggestMatches(
            newTopicName
          );
          if (result.data) {
            setSuggestions(result.data);
          }
        } catch (error) {
          console.error("Failed to fetch suggestions:", error);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [newTopicName]);

  // Handle page creation
  const handleCreatePage = async (topicName: string) => {
    try {
      // 1. Get or create canonical topic
      const topicResult = await window.api.canonicalTopics.createOrGet(
        topicName
      );
      if (topicResult.error || !topicResult.data) {
        console.error("Failed to get/create topic:", topicResult.error);
        toast.error("Failed to resolve topic");
        return;
      }

      const canonicalTopicId = topicResult.data.id;

      // Check if page already exists for this topic
      const existingPage = pages.find(
        (p) => p.canonicalTopicId === canonicalTopicId
      );
      if (existingPage) {
        onSelect(existingPage.id);
        setIsDialogOpen(false);
        setNewTopicName("");
        toast.info(`Already have a page for ${topicName}`);
        return;
      }

      // 2. Create the notebook page
      const newPage: NotebookTopicPage = {
        id: crypto.randomUUID(),
        canonicalTopicId,
        cardIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const pageResult = await window.api.notebookPages.create(newPage);
      if (pageResult.error) {
        console.error("Failed to create page:", pageResult.error);
        toast.error("Could not create notebook page");
        return;
      }

      // 3. Cleanup and notify parent
      toast.success(`Created topic page: ${topicName}`);
      onPageCreated();
      onSelect(newPage.id);
      setIsDialogOpen(false);
      setNewTopicName("");
    } catch (error) {
      console.error("Error creating topic page:", error);
    }
  };
  // Handle page deletion
  const handleDeletePage = async () => {
    if (!pageToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteNotebookPage(pageToDelete.id);
      if (result.success) {
        toast.success(`Deleted topic page: ${getTopicName(pageToDelete)}`);
        onPageDeleted?.(pageToDelete.id);
      } else {
        toast.error(`Failed to delete topic page: ${result.error}`);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("An unexpected error occurred during deletion");
    } finally {
      setIsDeleting(false);
      setPageToDelete(null);
    }
  };
  return (
    <div className="flex flex-col h-full bg-surface-base">
      {/* Header & Search */}
      <div className="p-4 space-y-4 border-b border-border/30 bg-surface-elevated/50">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Topic Pages
          </h2>
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30 text-primary transition-all duration-200"
                  onClick={() => setIsDialogOpen(true)}
                  aria-label="New Topic Page"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">New Topic Page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            className="pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto">
        {pages.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No topic pages yet</p>
              <p className="text-xs text-muted-foreground">
                Topics you curate will appear here.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Create First Topic
            </Button>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-muted-foreground">
              No topics match '{searchQuery}'
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredPages.map((page) => {
              const isActive = selectedId === page.id;
              return (
                <ContextMenu key={page.id}>
                  <ContextMenuTrigger>
                    <button
                      onClick={() => onSelect(page.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-white/5 group",
                        isActive
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-foreground"
                      )}
                    >
                      <span className="truncate mr-2">
                        {getTopicName(page)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-5 px-1.5 text-[11px] min-w-[20px] justify-center",
                          isActive
                            ? "bg-background/50"
                            : "bg-muted group-hover:bg-muted/80"
                        )}
                      >
                        {page.cardIds.length}
                      </Badge>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    <ContextMenuItem
                      className="text-destructive focus:bg-destructive focus:text-destructive-foreground cursor-pointer transition-colors"
                      onSelect={() => setPageToDelete(page)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Topic Page
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        )}
      </div>

      {/* New Topic Page Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Topic Page</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic Name</label>
              <div className="relative">
                <Input
                  autoFocus
                  placeholder="e.g., Atrial Fibrillation"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTopicName.trim()) {
                      handleCreatePage(newTopicName);
                    }
                  }}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Suggestions List */}
            {newTopicName.length >= 2 && (
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y text-sm">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between"
                    onClick={() => handleCreatePage(suggestion.canonicalName)}
                  >
                    <span>{suggestion.canonicalName}</span>
                    <span className="text-[11px] text-muted-foreground uppercase">
                      {suggestion.domain}
                    </span>
                  </button>
                ))}

                {/* Always show option to create new if not an exact match */}
                {!suggestions.some(
                  (s) =>
                    s.canonicalName.toLowerCase() === newTopicName.toLowerCase()
                ) && (
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-primary flex items-center"
                    onClick={() => handleCreatePage(newTopicName)}
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Create "{newTopicName}"
                  </button>
                )}

                {suggestions.length === 0 && !isSearching && (
                  <div className="px-3 py-2 text-muted-foreground italic text-xs">
                    No matching topics found.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newTopicName.trim()}
              onClick={() => handleCreatePage(newTopicName)}
            >
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!pageToDelete}
        onOpenChange={(open) => !open && setPageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic Page?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the page "
              {pageToDelete ? getTopicName(pageToDelete) : ""}", all its blocks,
              and all {pageToDelete?.cardIds.length || 0} associated flashcards.
              Source items will be returned to your inbox if they are not used
              elsewhere.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:brightness-90 transition-all"
              onClick={(e) => {
                e.preventDefault();
                handleDeletePage();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Page"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
