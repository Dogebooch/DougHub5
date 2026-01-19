import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NotebookBlock, NotebookLinkType } from "@/types";
import { Loader2, Search, Link2, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AddManualLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceBlock: NotebookBlock;
  sourceTopicName: string;
  onSuccess: () => void;
}

const LINK_TYPES: { value: NotebookLinkType; label: string }[] = [
  { value: "same_concept", label: "Same idea expressed differently" },
  {
    value: "related_topic",
    label: "Connected concepts worth reviewing together",
  },
  {
    value: "cross_specialty",
    label: "Same topic from different specialty's perspective",
  },
  { value: "comparison", label: "Compare or contrast these concepts" },
  {
    value: "builds_on",
    label: "Understanding this requires understanding that first",
  },
];

export function AddManualLinkModal({
  open,
  onOpenChange,
  sourceBlock,
  sourceTopicName,
  onSuccess,
}: AddManualLinkModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { block: NotebookBlock; topicName: string; excerpt: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<NotebookLinkType>("related_topic");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anchor text state
  const [showAnchor, setShowAnchor] = useState(false);
  const [anchorText, setAnchorText] = useState<string | null>(null);
  const [anchorStart, setAnchorStart] = useState<number | null>(null);
  const [anchorEnd, setAnchorEnd] = useState<number | null>(null);

  const { toast } = useToast();
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedTargetId(null);
      setAnchorText(null);
      setAnchorStart(null);
      setAnchorEnd(null);
      setShowAnchor(false);
    }
  }, [open]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await window.api.notebookBlocks.searchByContent(
          query.trim(),
          sourceBlock.id,
        );
        if (res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout.current);
  }, [query, sourceBlock.id]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
      return;

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text) return;

    // Get offsets relative to the parent container
    // This is simplified but should work for plain text blocks
    setAnchorText(text);
    setAnchorStart(range.startOffset);
    setAnchorEnd(range.endOffset);
  };

  const handleCreateLink = async () => {
    if (!selectedTargetId) return;

    setIsSubmitting(true);
    try {
      const res = await window.api.notebookLinks.create({
        sourceBlockId: sourceBlock.id,
        targetBlockId: selectedTargetId,
        linkType: linkType,
        anchorText: anchorText || undefined,
        anchorStart: anchorStart !== null ? anchorStart : undefined,
        anchorEnd: anchorEnd !== null ? anchorEnd : undefined,
      });

      if (res.error) {
        if (
          res.error.includes("UNIQUE constraint failed") ||
          res.error.includes("already exists")
        ) {
          toast({
            title: "Duplicate Link",
            description: "This link already exists.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: res.error,
            variant: "destructive",
          });
        }
      } else {
        toast({ description: "Link created successfully" });
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Add Manual Link
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-2">
          {/* Linking From Section */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Linking from:
            </Label>
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <Badge variant="outline" className="bg-background">
                {sourceTopicName}
              </Badge>
              <p className="text-sm text-muted-foreground italic line-clamp-2">
                "{sourceBlock.content.substring(0, 80)}..."
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-blocks">Search topic or content</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-blocks"
                  placeholder="Search blocks..."
                  className="pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Search Results</Label>
                {isSearching && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="border rounded-md max-h-[200px] overflow-y-auto bg-muted/5">
                {results.length > 0 ? (
                  <RadioGroup
                    value={selectedTargetId || ""}
                    onValueChange={setSelectedTargetId}
                    className="p-1 gap-1"
                  >
                    {results.map((res) => (
                      <div
                        key={res.block.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-sm transition-colors cursor-pointer hover:bg-muted/50",
                          selectedTargetId === res.block.id &&
                            "bg-primary/10 border-primary/20",
                        )}
                        onClick={() => setSelectedTargetId(res.block.id)}
                      >
                        <RadioGroupItem
                          value={res.block.id}
                          id={res.block.id}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {res.topicName}
                          </Badge>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {res.excerpt}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    {query.trim().length >= 2 ? (
                      `No blocks found matching "${query}"`
                    ) : (
                      "Type at least 2 characters to search"
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Link Type Section */}
          <div className="space-y-2">
            <Label htmlFor="link-type">Relationship Type</Label>
            <Select
              value={linkType}
              onValueChange={(v) => setLinkType(v as NotebookLinkType)}
            >
              <SelectTrigger id="link-type">
                <SelectValue placeholder="Select link type" />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Anchor Text Section */}
          <Collapsible
            open={showAnchor}
            onOpenChange={setShowAnchor}
            className="border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-3 h-auto font-normal"
              >
                <span className="text-sm font-medium">
                  Add anchor text (optional)
                </span>
                {showAnchor ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-3 pt-0 space-y-3">
              <div
                className="p-3 text-sm border rounded bg-muted/10 max-h-[150px] overflow-y-auto whitespace-pre-wrap select-text selection:bg-primary/30"
                onMouseUp={handleSelection}
              >
                {sourceBlock.content}
              </div>

              {anchorText && (
                <div className="flex items-center justify-between p-2 rounded bg-primary/5 border border-primary/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase text-primary font-bold">
                      Selected Anchor:
                    </p>
                    <p className="text-sm italic truncate">"{anchorText}"</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setAnchorText(null);
                      setAnchorStart(null);
                      setAnchorEnd(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter className="p-6 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selectedTargetId || isSubmitting}
            onClick={handleCreateLink}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
