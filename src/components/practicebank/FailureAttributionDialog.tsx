/**
 * FailureAttributionDialog
 *
 * Manual failure attribution checklist shown after a review failure.
 * Implements the "Anti-Anki-Hell" philosophy - helps identify WHY recall failed.
 *
 * Categories:
 * 1. Encoding Issue - Never saw it properly
 * 2. Retrieval Block - Knew it but couldn't access
 * 3. Interference - Mixed up with similar concept
 * 4. Context Gap - Lacked real-world context
 * 5. Rushed/Fatigue - Not a knowledge issue
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Unlock,
  Shuffle,
  Map,
  Zap,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
} from "lucide-react";

// Failure attribution options (matching backend)
export interface FailureAttributionOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const FAILURE_ATTRIBUTION_OPTIONS: FailureAttributionOption[] = [
  {
    id: "encoding_failure",
    label: "Encoding Issue",
    description: "I never really learned this properly in the first place",
    icon: <Brain className="w-4 h-4" />,
    color: "text-red-400 border-red-400/30 bg-red-400/10",
  },
  {
    id: "retrieval_block",
    label: "Retrieval Block",
    description: "I knew this but couldn't access it in the moment",
    icon: <Unlock className="w-4 h-4" />,
    color: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  },
  {
    id: "interference",
    label: "Interference",
    description: "I mixed this up with a similar concept",
    icon: <Shuffle className="w-4 h-4" />,
    color: "text-purple-400 border-purple-400/30 bg-purple-400/10",
  },
  {
    id: "context_gap",
    label: "Context Gap",
    description: "I lacked the clinical context to apply this",
    icon: <Map className="w-4 h-4" />,
    color: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  },
  {
    id: "rushed_fatigue",
    label: "Rushed/Fatigue",
    description: "I was tired or hurrying - not a knowledge issue",
    icon: <Zap className="w-4 h-4" />,
    color: "text-gray-400 border-gray-400/30 bg-gray-400/10",
  },
];

interface FailureAttributionDialogProps {
  open: boolean;
  onClose: () => void;
  cardFront: string;
  cardBack: string;
  entityTitle?: string;
  onSubmit: (attributions: string[], notes: string) => void;
}

export const FailureAttributionDialog: React.FC<
  FailureAttributionDialogProps
> = ({ open, onClose, cardFront, cardBack, entityTitle, onSubmit }) => {
  const [selectedAttributions, setSelectedAttributions] = useState<Set<string>>(
    new Set(),
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle attribution selection
  const toggleAttribution = (id: string) => {
    setSelectedAttributions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedAttributions.size === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(Array.from(selectedAttributions), notes);
      // Reset state
      setSelectedAttributions(new Set());
      setNotes("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get suggested action based on attributions
  const getSuggestedAction = (): string | null => {
    if (selectedAttributions.has("encoding_failure")) {
      return "💡 Re-study the source material and activate more Practice Bank cards";
    }
    if (selectedAttributions.has("interference")) {
      return "💡 Create a comparison table between similar concepts";
    }
    if (selectedAttributions.has("context_gap")) {
      return "💡 Try the Simulator with clinical vignettes for this topic";
    }
    if (selectedAttributions.has("retrieval_block")) {
      return "💡 This card may benefit from more spaced repetitions";
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Why did this card fail?
          </DialogTitle>
          <DialogDescription>
            Understanding your failure pattern helps improve future learning
          </DialogDescription>
        </DialogHeader>

        {/* Card Preview */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50 mb-4">
          <p className="text-sm font-medium mb-1">{cardFront}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {cardBack}
          </p>
          {entityTitle && (
            <Badge variant="outline" className="mt-2 text-xs">
              {entityTitle}
            </Badge>
          )}
        </div>

        {/* Attribution Options */}
        <div className="space-y-2">
          {FAILURE_ATTRIBUTION_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => toggleAttribution(option.id)}
              className={`w-full p-3 rounded-lg border transition-all flex items-start gap-3 text-left ${
                selectedAttributions.has(option.id)
                  ? `${option.color} border-2`
                  : "border-border/50 hover:border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div
                className={`mt-0.5 ${
                  selectedAttributions.has(option.id)
                    ? ""
                    : "text-muted-foreground"
                }`}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{option.label}</span>
                  {selectedAttributions.has(option.id) && (
                    <CheckCircle className="w-3 h-3 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="failure-notes" className="text-sm">
            Additional notes (optional)
          </Label>
          <Textarea
            id="failure-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What confused you? What would have helped?"
            className="min-h-[60px] text-sm"
          />
        </div>

        {/* Suggested Action */}
        {getSuggestedAction() && (
          <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <p className="text-sm text-primary">{getSuggestedAction()}</p>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedAttributions.size === 0 || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Saving..." : "Save Attribution"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FailureAttributionDialog;
