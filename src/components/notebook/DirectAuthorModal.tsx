import { useState, useEffect, useCallback, useRef } from "react";
import { Star, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { NotebookBlock } from "@/types";

interface DirectAuthorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicName: string;
  pageId: string;
  onSave: (block: NotebookBlock) => void;
}

type CalloutType = "pearl" | "trap" | "caution" | null;

const DRAFT_KEY_PREFIX = "doughub-direct-author-draft-";

/**
 * DirectAuthorModal
 *
 * Modal for writing notes directly into a topic page without a Library source.
 * Supports auto-save drafts, callout type selection, and high-yield marking.
 */
export function DirectAuthorModal({
  open,
  onOpenChange,
  topicName,
  pageId,
  onSave,
}: DirectAuthorModalProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [content, setContent] = useState("");
  const [calloutType, setCalloutType] = useState<CalloutType>(null);
  const [isHighYield, setIsHighYield] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Draft key for this specific topic page
  const draftKey = `${DRAFT_KEY_PREFIX}${pageId}`;

  // Load draft on open
  useEffect(() => {
    if (open) {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setContent(parsed.content || "");
          setCalloutType(parsed.calloutType || null);
          setIsHighYield(parsed.isHighYield || false);
        } catch {
          // Invalid draft, ignore
        }
      }
      // Focus textarea after a short delay (after animation)
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open, draftKey]);

  // Auto-save draft with 2-second debounce
  const saveDraft = useCallback(() => {
    if (content.trim()) {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ content, calloutType, isHighYield })
      );
    }
  }, [content, calloutType, isHighYield, draftKey]);

  useEffect(() => {
    if (!open) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(saveDraft, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, calloutType, isHighYield, open, saveDraft]);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
  }, [draftKey]);

  // Reset form state
  const resetForm = useCallback(() => {
    setContent("");
    setCalloutType(null);
    setIsHighYield(false);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    // Don't clear draft on cancel - user might want to come back
    resetForm();
    onOpenChange(false);
  }, [resetForm, onOpenChange]);

  // Handle discard (explicitly clear draft)
  const handleDiscard = useCallback(() => {
    clearDraft();
    resetForm();
    onOpenChange(false);
  }, [clearDraft, resetForm, onOpenChange]);

  // Handle save
  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Empty Note",
        description: "Please write some content before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Fetch existing blocks to determine next position
      const blocksResult = await window.api.notebookBlocks.getByPage(pageId);

      if (blocksResult.error) {
        throw new Error(blocksResult.error);
      }

      const existingBlocks = blocksResult.data || [];
      const maxPosition =
        existingBlocks.length > 0
          ? Math.max(...existingBlocks.map((b) => b.position))
          : 0;

      // 2. Create new block with null sourceItemId (direct authoring)
      const newBlock: NotebookBlock = {
        id: crypto.randomUUID(),
        notebookTopicPageId: pageId,
        sourceItemId: null, // Direct authoring - no Library source
        content: content.trim(),
        position: maxPosition + 1,
        cardCount: 0,
        calloutType: calloutType,
        isHighYield: isHighYield,
      };

      const createResult = await window.api.notebookBlocks.create(newBlock);

      if (createResult.error) {
        throw new Error(createResult.error);
      }

      // 3. Success - clear draft and close
      clearDraft();
      resetForm();

      toast({
        title: "Note Saved",
        description: `Your note has been added to "${topicName}"`,
      });

      onSave(newBlock);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating block:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there's a draft to restore
  const hasDraft = Boolean(localStorage.getItem(draftKey));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Note for {topicName}</DialogTitle>
          <DialogDescription>
            Write a note directly into this topic page. This note won't be
            linked to a Library source.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 py-4 min-h-0">
          {/* Content textarea */}
          <div className="flex-1 flex flex-col min-h-0">
            <Label htmlFor="content" className="mb-2">
              Content
            </Label>
            <Textarea
              id="content"
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="flex-1 min-h-[300px] resize-none font-mono text-sm"
              disabled={isSubmitting}
            />
          </div>

          {/* Options row */}
          <div className="flex items-center gap-6 flex-wrap">
            {/* Callout type selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="callout-type" className="text-sm whitespace-nowrap">
                Callout Type
              </Label>
              <Select
                value={calloutType || "none"}
                onValueChange={(value) =>
                  setCalloutType(value === "none" ? null : (value as CalloutType))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="callout-type" className="w-[140px]">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pearl">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-notebook-pearl" />
                      Pearl
                    </span>
                  </SelectItem>
                  <SelectItem value="trap">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-notebook-trap" />
                      Trap
                    </span>
                  </SelectItem>
                  <SelectItem value="caution">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-notebook-caution" />
                      Caution
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* High-yield checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="high-yield"
                checked={isHighYield}
                onCheckedChange={(checked) => setIsHighYield(checked === true)}
                disabled={isSubmitting}
              />
              <Label
                htmlFor="high-yield"
                className="text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Star className="h-3.5 w-3.5 text-warning" />
                Mark as High-Yield
              </Label>
            </div>
          </div>

          {/* Draft indicator */}
          {hasDraft && content.trim() && (
            <p className="text-xs text-muted-foreground">
              Draft auto-saved. Your work will be restored if you close and
              reopen.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasDraft && (
            <Button
              variant="ghost"
              onClick={handleDiscard}
              disabled={isSubmitting}
              className="text-destructive hover:text-destructive"
            >
              Discard Draft
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
