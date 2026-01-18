import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { InsightTextarea } from "./InsightTextarea";
import { NotebookBlock } from "@/types";

interface BlockEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: NotebookBlock | null;
  topicName: string;
  onSave: (blockId: string, newContent: string) => Promise<void>;
}

export const BlockEditModal: React.FC<BlockEditModalProps> = ({
  open,
  onOpenChange,
  block,
  topicName,
  onSave,
}) => {
  const [content, setContent] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Reset content when block changes or modal opens
  useEffect(() => {
    if (block && open) {
      setContent(block.content);
    }
  }, [block, open]);

  const hasChanges = block ? content !== block.content : false;
  const canSave = isValid && hasChanges && !isSaving;

  const handleSave = async () => {
    if (!block || !canSave) return;
    
    setIsSaving(true);
    try {
      await onSave(block.id, content);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save block:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseAttempt = (open: boolean) => {
    // Only intercept close attempts (open = false)
    if (!open && hasChanges) {
      setShowDiscardDialog(true);
      return; // Don't close yet
    }
    onOpenChange(open);
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    onOpenChange(false);
  };

  if (!block) return null;

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Editing Block
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Topic: {topicName}
          </p>
        </DialogHeader>
        <div className="py-4">
          <InsightTextarea
            value={content}
            onChange={setContent}
            onValidChange={setIsValid}
            minLength={20}
            placeholder="What did you learn from this source?"
          />
        </div>

        {/* Stale card warning */}
        {(block.cardCount ?? 0) > 0 && (
          <div className="flex items-start gap-3 p-3 mb-4 rounded-md bg-warning/10 border border-warning/30 text-sm">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-warning-foreground">
              <span className="font-medium">{block.cardCount} {block.cardCount === 1 ? 'card' : 'cards'}</span>
              {' '}reference{block.cardCount === 1 ? 's' : ''} this block. Changes may make {block.cardCount === 1 ? 'it' : 'them'} outdated.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleCloseAttempt(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits that will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
