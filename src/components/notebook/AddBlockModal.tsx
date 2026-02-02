import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, PenTool, Library, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { SourceItem, NotebookBlock } from "@/types";

interface AddBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookTopicPageId: string;
  onSuccess: () => void;
  insertionIndex?: number; // If provided, insert at this visual index
  defaultMode?: "library" | "manual" | "trap";
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  qbank: "Q Bank",
  article: "Article",
  pdf: "PDF",
  image: "Image",
  audio: "Audio",
  quickcapture: "Quick Capture",
  manual: "Manual",
};

export function AddBlockModal({
  open,
  onOpenChange,
  notebookTopicPageId,
  onSuccess,
  insertionIndex,
  defaultMode = "library",
}: AddBlockModalProps) {
  const [activeTab, setActiveTab] = useState<string>("library");
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Entry State
  const [manualContent, setManualContent] = useState("");
  const [calloutType, setCalloutType] = useState<
    "standard" | "pearl" | "trap" | "caution"
  >("standard");

  const { toast } = useToast();

  // Initialize tabs based on defaultMode
  useEffect(() => {
    if (open) {
      if (defaultMode === "trap") {
        setActiveTab("manual");
        setCalloutType("trap");
      } else {
        setActiveTab(defaultMode);
        setCalloutType("standard");
      }
      setManualContent("");
    }
  }, [open, defaultMode]);

  // Fetch sources when modal opens (only if in library tab or generally)
  useEffect(() => {
    let cancelled = false;

    const fetchSources = async () => {
      if (!open) return;

      setLoading(true);
      try {
        const result = await window.api.sourceItems.getAll();

        if (cancelled) return;

        if (result.error) {
          console.error("Failed to fetch sources:", result.error);
          toast({
            title: "Error",
            description: "Failed to load sources from Library",
            variant: "destructive",
          });
          setSources([]);
          return;
        }

        const eligible = (result.data || []).filter(
          (item) => item.status === "processed" || item.status === "curated",
        );
        setSources(eligible);
      } catch (error) {
        if (cancelled) return;
        setSources([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSources();

    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  // Filter sources
  const filteredSources = useMemo(() => {
    if (!search.trim()) return sources;
    const searchLower = search.toLowerCase();
    return sources.filter((source) =>
      source.title.toLowerCase().includes(searchLower),
    );
  }, [sources, search]);

  const calculatePosition = async (): Promise<number> => {
    const blocksResult =
      await window.api.notebookBlocks.getByPage(notebookTopicPageId);
    if (blocksResult.error) throw new Error(blocksResult.error);

    const blocks = blocksResult.data || [];

    if (typeof insertionIndex === "number") {
      // Insert between index and index-1
      // If index is 0, put before first block
      if (insertionIndex === 0) {
        const first = blocks[0];
        return first ? first.position - 1 : 1;
        // Note: Position might be float. If integer, we might need 0.5.
        // Let's assume we can use floats.
      }

      // If index >= length, append
      if (insertionIndex >= blocks.length) {
        const last = blocks[blocks.length - 1];
        return last ? last.position + 1 : 1;
      }

      // Between two blocks
      const prev = blocks[insertionIndex - 1];
      const next = blocks[insertionIndex];
      return (prev.position + next.position) / 2;
    }

    // Default: Append
    if (blocks.length === 0) return 1;
    return Math.max(...blocks.map((b) => b.position)) + 1;
  };

  const handleCreateBlock = async (source?: SourceItem) => {
    if (activeTab === "manual" && !manualContent.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some text.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const position = await calculatePosition();

      const newBlock: NotebookBlock = {
        id: crypto.randomUUID(),
        notebookTopicPageId,
        sourceItemId: source?.id || null, // null for manual
        content: source ? source.rawContent : manualContent,
        annotations: undefined,
        mediaPath: source?.mediaPath || undefined,
        position: position,
        cardCount: 0,
        isHighYield: false,
        calloutType:
          activeTab === "manual" && calloutType !== "standard"
            ? calloutType
            : null,
      };

      const createResult = await window.api.notebookBlocks.create(newBlock);

      if (createResult.error) {
        throw new Error(createResult.error);
      }

      // If source, update status
      if (source) {
        await window.api.sourceItems.update(source.id, { status: "curated" });
      }

      toast({
        title: "Block Added",
        description: source
          ? `"${source.title}" added to notebook`
          : "Note added successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating block:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add block",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Add Content Block</DialogTitle>
          <DialogDescription>
            Add a new section to your notebook topic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col h-full"
          >
            <div className="px-6 mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="library"
                  className="flex items-center gap-2"
                >
                  <Library className="h-4 w-4" />
                  From Library
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Quick Note / Trap
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="library"
              className="flex-1 flex flex-col overflow-hidden mt-0 data-[state=active]:flex"
            >
              {/* Search Bar */}
              <div className="px-6 mb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sources..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    disabled={loading || isSubmitting}
                  />
                </div>
              </div>

              {/* List */}
              <ScrollArea className="flex-1 px-6">
                <div className="pb-6 pt-2 space-y-2">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      Loading...
                    </div>
                  ) : sources.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No sources found. Capture content first.
                    </div>
                  ) : filteredSources.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No matches for "{search}"
                    </div>
                  ) : (
                    filteredSources.map((source) => (
                      <button
                        key={source.id}
                        onClick={() => handleCreateBlock(source)}
                        disabled={isSubmitting}
                        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-medium text-sm truncate pr-2">
                            {source.title}
                          </div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 shrink-0"
                          >
                            {SOURCE_TYPE_LABELS[source.sourceType] ||
                              source.sourceType}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 opacity-80 group-hover:opacity-100">
                          {source.rawContent}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="manual"
              className="flex-1 flex flex-col overflow-hidden mt-0 p-6 pt-0 data-[state=active]:flex"
            >
              <div className="flex flex-col gap-4 flex-1">
                <div className="space-y-2">
                  <Label>Block Type</Label>
                  <RadioGroup
                    value={calloutType}
                    onValueChange={(val: any) => setCalloutType(val)}
                    className="grid grid-cols-2 gap-2"
                  >
                    <Label
                      className={`flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-accent ${calloutType === "standard" ? "border-primary ring-1 ring-primary" : ""}`}
                    >
                      <RadioGroupItem value="standard" id="type-std" />
                      <span className="font-normal">Standard Note</span>
                    </Label>
                    <Label
                      className={`flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 ${calloutType === "trap" ? "border-destructive ring-1 ring-destructive bg-red-50/50 dark:bg-red-950/10" : ""}`}
                    >
                      <RadioGroupItem value="trap" id="type-trap" />
                      <span className="font-normal text-destructive">
                        Exam Trap
                      </span>
                    </Label>
                    <Label
                      className={`flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20 ${calloutType === "pearl" ? "border-amber-500 ring-1 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                    >
                      <RadioGroupItem value="pearl" id="type-pearl" />
                      <span className="font-normal text-amber-600 dark:text-amber-400">
                        Clinical Pearl
                      </span>
                    </Label>
                    <Label
                      className={`flex items-center gap-2 border rounded-md p-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/20 ${calloutType === "caution" ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
                    >
                      <RadioGroupItem value="caution" id="type-caution" />
                      <span className="font-normal text-blue-600 dark:text-blue-400">
                        Caution
                      </span>
                    </Label>
                  </RadioGroup>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Type your note here..."
                    className="flex-1 resize-none font-mono text-sm leading-relaxed"
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCreateBlock()}
                  disabled={isSubmitting || !manualContent.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Add Block"
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
