import { useState, useEffect, useCallback } from 'react';
import { Loader2, X, RotateCcw } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CardEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  initialFront: string;
  initialBack: string;
  initialTags: string[];
  initialReps?: number;
  onSave: () => void;
}

export function CardEditModal({
  open,
  onOpenChange,
  cardId,
  initialFront,
  initialBack,
  initialTags,
  initialReps = 0,
  onSave,
}: CardEditModalProps) {
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { toast } = useToast();

  // Reset state when modal opens with new card
  useEffect(() => {
    if (open) {
      setFront(initialFront);
      setBack(initialBack);
      setTags(initialTags);
      setTagInput("");
      setError(null);
      setShowResetConfirm(false);
    }
  }, [open, initialFront, initialBack, initialTags, initialReps]);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!front.trim()) {
      setError("Front text is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.api.cards.update(cardId, {
        front: front.trim(),
        back: back.trim(),
        tags,
      });

      if (result.error) {
        setError(result.error);
        toast({
          title: "Failed to save card",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Card updated",
          description: "Your changes have been saved.",
        });
        onSave();
        onOpenChange(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save card";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProgress = async () => {
    setIsLoading(true);
    try {
      const result = await window.api.cards.update(cardId, {
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 0, // New
        lastReview: null,
        dueDate: new Date().toISOString(),
      });

      if (result.error) {
        toast({
          title: "Failed to reset progress",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Progress reset",
          description: "Card has been reset to New state.",
        });
        onSave();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Reset progress failed:", err);
    } finally {
      setIsLoading(false);
      setShowResetConfirm(false);
    }
  };

  // Ctrl+Enter to save
  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl" onKeyDown={handleFormKeyDown}>
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label
                htmlFor="front"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Front
              </Label>
              <Textarea
                id="front"
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Enter the question or prompt..."
                className="min-h-[100px] resize-none"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="back"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Back
              </Label>
              <Textarea
                id="back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="Enter the answer..."
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="tags"
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                Tags
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] py-0.5 px-2 font-normal gap-1 group"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a tag..."
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="h-8"
                >
                  Add
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            <div className="flex-1">
              {initialReps > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/40 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Reset Progress
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || !front.trim()}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>

          <p className="text-[10px] text-muted-foreground text-center -mt-2">
            Press Ctrl+Enter to save
          </p>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset card progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the card to "New" status and clear all FSRS
              scheduling data. The card will appear in your next review session.
              Review history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetProgress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
