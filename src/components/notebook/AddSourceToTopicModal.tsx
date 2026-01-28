import { useState, useEffect } from "react";
import { Loader2, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { SourceItem, CanonicalTopic, NotebookBlock } from "@/types";
import { TopicSelector } from "./TopicSelector";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AddSourceToTopicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItem: SourceItem;
  existingBlockId?: string; // The block we are coming from
  onSuccess: (newBlockId: string) => void;
}

interface ExistingBlockInfo {
  block: NotebookBlock;
  topicName: string;
  pageId: string;
}

export function AddSourceToTopicModal({
  open,
  onOpenChange,
  sourceItem,
  existingBlockId,
  onSuccess,
}: AddSourceToTopicModalProps) {
  const [existingBlocks, setExistingBlocks] = useState<ExistingBlockInfo[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<CanonicalTopic | null>(
    null,
  );
  const [insight, setInsight] = useState("");
  const [isInsightValid, setIsInsightValid] = useState(false);
  const [linkToExisting, setLinkToExisting] = useState(true);

  // Validate insight length
  useEffect(() => {
    setIsInsightValid(insight.length >= 20);
  }, [insight]);

  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  // Load existing blocks for this source
  useEffect(() => {
    if (open && sourceItem) {
      const fetchExisting = async () => {
        setIsLoadingExisting(true);
        try {
          const result = await window.api.notebookBlocks.getBySource(
            sourceItem.id,
          );
          if (result.data) {
            setExistingBlocks(result.data);
          }
        } catch (error) {
          console.error("Failed to load existing blocks:", error);
        } finally {
          setIsLoadingExisting(false);
        }
      };
      fetchExisting();
    }
  }, [open, sourceItem]);

  // Handle saving
  const handleSave = async () => {
    if (!selectedTopic || !isInsightValid || isSaving) return;

    setIsSaving(true);
    try {
      const result = await window.api.notebookBlocks.addToAnotherTopic({
        sourceItemId: sourceItem.id,
        topicId: selectedTopic.id,
        insight,
        linkToBlockId: linkToExisting ? existingBlockId : undefined,
      });

      if (result.data) {
        toast({
          title: "Added to Notebook",
          description: `Linked to topic: ${selectedTopic.canonicalName}`,
        });
        onSuccess(result.data.id);
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Failed to add to topic");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyInsight = (text: string) => {
    setInsight(text);
    toast({
      description: "Insight copied",
      duration: 2000,
    });
  };

  // Check if current source is already in the selected topic
  const isDuplicate =
    selectedTopic &&
    existingBlocks.some(
      (b) =>
        b.topicName.toLowerCase() === selectedTopic.canonicalName.toLowerCase(),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Add to Another Topic</DialogTitle>
          <DialogDescription>
            Specify a different specialty or topic angle for this source.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Source Info */}
            <div className="p-3 rounded-md bg-muted/50 border border-border flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm line-clamp-2">
                  {sourceItem.title}
                </h4>
                <div className="flex gap-2 mt-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase bg-background"
                  >
                    {sourceItem.sourceType}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Existing Topics */}
            {existingBlocks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Already in:
                </Label>
                <div className="grid gap-2">
                  {existingBlocks.map((info) => (
                    <div
                      key={info.block.id}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border text-sm",
                        info.block.id === existingBlockId
                          ? "bg-accent/50 border-accent/50"
                          : "bg-card",
                      )}
                    >
                      <span className="font-medium">{info.topicName}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-xs hover:bg-accent"
                        onClick={() => copyInsight(info.block.content)}
                      >
                        <Copy className="h-3 w-3" />
                        Copy Insight
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topic Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Select Target Topic
              </Label>
              <TopicSelector
                selectedTopic={selectedTopic}
                onTopicSelect={setSelectedTopic}
                className="w-full"
              />
              {isDuplicate && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  This source is already in this topic.
                </p>
              )}
            </div>

            {/* Insight */}
            <div className="space-y-3">
              <Textarea
                value={insight}
                onChange={(e) => setInsight(e.target.value)}
                placeholder={`What's the ${selectedTopic?.canonicalName || "topic"} angle?`}
                className="min-h-[120px] resize-none"
              />
            </div>

            {/* Linking Options */}
            {existingBlockId && (
              <div className="flex items-center space-x-2 p-1">
                <Checkbox
                  id="link-blocks"
                  checked={linkToExisting}
                  onCheckedChange={(checked) => setLinkToExisting(!!checked)}
                />
                <label
                  htmlFor="link-blocks"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Link these blocks (Cross-specialty provenance)
                </label>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 bg-muted/30 border-t items-center gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !selectedTopic || !isInsightValid || isSaving || isDuplicate
            }
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to Topic
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
