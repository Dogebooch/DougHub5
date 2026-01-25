import React, { useState, useEffect } from "react";
import { AlertTriangle, Lightbulb, ShieldAlert } from "lucide-react";
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

type CalloutType = 'pearl' | 'trap' | 'caution' | null;

interface BlockEditUpdates {
  content?: string;
  userInsight?: string;
  calloutType?: CalloutType;
}

interface BlockEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: NotebookBlock | null;
  topicName: string;
  onSave: (blockId: string, updates: BlockEditUpdates) => Promise<void>;
  displayField?: 'content' | 'userInsight';
}

export const BlockEditModal: React.FC<BlockEditModalProps> = ({
  open,
  onOpenChange,
  block,
  topicName,
  onSave,
  displayField = 'content',
}) => {
  const [textValue, setTextValue] = useState("");
  const [calloutType, setCalloutType] = useState<CalloutType>(null);
  const [isValid, setIsValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Get the original value based on displayField
  const getOriginalText = (b: NotebookBlock | null) => {
    if (!b) return "";
    return displayField === 'userInsight'
      ? (b.userInsight || b.content)
      : b.content;
  };

  // Reset values when block changes or modal opens
  useEffect(() => {
    if (block && open) {
      setTextValue(getOriginalText(block));
      setCalloutType(block.calloutType || null);
    }
  }, [block, open, displayField]);

  const originalText = getOriginalText(block);
  const originalCalloutType = block?.calloutType || null;

  const hasTextChanges = textValue !== originalText;
  const hasCalloutChanges = calloutType !== originalCalloutType;
  const hasChanges = hasTextChanges || hasCalloutChanges;
  // Allow save if: (text is valid AND text changed) OR (only callout changed)
  const canSave = ((isValid && hasTextChanges) || (hasCalloutChanges && !hasTextChanges)) && hasChanges && !isSaving;

  const handleSave = async () => {
    if (!block || !canSave) return;

    setIsSaving(true);
    try {
      const updates: BlockEditUpdates = {};

      if (hasTextChanges) {
        if (displayField === 'userInsight') {
          updates.userInsight = textValue;
        } else {
          updates.content = textValue;
        }
      }

      if (hasCalloutChanges) {
        updates.calloutType = calloutType;
      }

      await onSave(block.id, updates);
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

  const dialogTitle = displayField === 'userInsight' ? 'Edit Insight' : 'Edit Block Content';

  const calloutOptions: { value: CalloutType; label: string; icon: React.ReactNode; colorClass: string }[] = [
    { value: null, label: 'None', icon: null, colorClass: '' },
    { value: 'pearl', label: 'Pearl', icon: <Lightbulb className="h-4 w-4" />, colorClass: 'bg-success text-success-foreground' },
    { value: 'trap', label: 'Trap', icon: <AlertTriangle className="h-4 w-4" />, colorClass: 'bg-warning text-warning-foreground' },
    { value: 'caution', label: 'Caution', icon: <ShieldAlert className="h-4 w-4" />, colorClass: 'bg-destructive text-destructive-foreground' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {dialogTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Topic: {topicName}
          </p>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <InsightTextarea
            value={textValue}
            onChange={setTextValue}
            onValidChange={setIsValid}
            minLength={20}
            placeholder="What did you learn from this source?"
          />

          {/* Callout type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Callout Style</label>
            <div className="flex gap-2">
              {calloutOptions.map((option) => (
                <Button
                  key={option.value ?? 'none'}
                  type="button"
                  variant={calloutType === option.value ? 'default' : 'outline'}
                  size="sm"
                  className={calloutType === option.value ? option.colorClass : ''}
                  onClick={() => setCalloutType(option.value)}
                >
                  {option.icon}
                  <span className={option.icon ? 'ml-1' : ''}>{option.label}</span>
                </Button>
              ))}
            </div>
          </div>
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
