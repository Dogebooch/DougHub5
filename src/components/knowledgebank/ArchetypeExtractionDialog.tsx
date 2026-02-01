import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Stethoscope,
  Pill,
  Bug,
  AlertCircle,
  FlaskConical,
  Activity,
  Syringe,
  Bone,
  Calculator,
  Lightbulb,
  Sparkles,
  FileText,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import {
  type KnowledgeEntityType,
  ARCHETYPE_LABELS,
  GOLDEN_TICKET_PROMPTS,
  GOLDEN_TICKET_FIELDS,
} from "@/types/knowledge-entities";

// Icon mapping
const ARCHETYPE_ICONS: Record<KnowledgeEntityType, React.ReactNode> = {
  illness_script: <Stethoscope className="w-5 h-5" />,
  drug: <Pill className="w-5 h-5" />,
  pathogen: <Bug className="w-5 h-5" />,
  presentation: <AlertCircle className="w-5 h-5" />,
  diagnostic: <FlaskConical className="w-5 h-5" />,
  imaging_finding: <Activity className="w-5 h-5" />,
  procedure: <Syringe className="w-5 h-5" />,
  anatomy: <Bone className="w-5 h-5" />,
  algorithm: <Calculator className="w-5 h-5" />,
  generic_concept: <Lightbulb className="w-5 h-5" />,
};

interface ArchetypeExtractionDialogProps {
  open: boolean;
  onClose: () => void;
  // Pre-fill data
  suggestedType?: KnowledgeEntityType;
  suggestedTitle?: string;
  sourceItemId?: string;
  aiHint?: string; // AI-generated hint for Golden Ticket
  // Callbacks
  onSave: (entity: {
    entityType: KnowledgeEntityType;
    title: string;
    goldenTicketValue: string;
    structuredData: Record<string, unknown>;
    sourceItemId?: string;
  }) => void;
  onSaveAsDraft?: (entity: {
    entityType: KnowledgeEntityType;
    title: string;
    structuredData: Record<string, unknown>;
    sourceItemId?: string;
  }) => void;
}

export const ArchetypeExtractionDialog: React.FC<
  ArchetypeExtractionDialogProps
> = ({
  open,
  onClose,
  suggestedType = "generic_concept",
  suggestedTitle = "",
  sourceItemId,
  aiHint,
  onSave,
  onSaveAsDraft,
}) => {
  // Form state
  const [entityType, setEntityType] =
    useState<KnowledgeEntityType>(suggestedType);
  const [title, setTitle] = useState(suggestedTitle);
  const [goldenTicketValue, setGoldenTicketValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setEntityType(suggestedType);
      setTitle(suggestedTitle);
      setGoldenTicketValue("");
      setShowHint(false);
    }
  }, [open, suggestedType, suggestedTitle]);

  // Dynamic Golden Ticket field info
  const goldenTicketField = useMemo(
    () => GOLDEN_TICKET_FIELDS[entityType],
    [entityType],
  );
  const goldenTicketPrompt = useMemo(
    () => GOLDEN_TICKET_PROMPTS[entityType],
    [entityType],
  );

  // Validation
  const isValid =
    title.trim().length > 0 && goldenTicketValue.trim().length > 0;
  const canSaveAsDraft = title.trim().length > 0;

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter = Save (if valid)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isValid) {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Shift+Enter = Save as Draft
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key === "Enter" &&
        canSaveAsDraft
      ) {
        e.preventDefault();
        handleSaveAsDraft();
      }
      // Escape = Close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isValid, canSaveAsDraft, title, goldenTicketValue, entityType]);

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      await onSave({
        entityType,
        title: title.trim(),
        goldenTicketValue: goldenTicketValue.trim(),
        structuredData: {
          [goldenTicketField]: goldenTicketValue.trim(),
        },
        sourceItemId,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!canSaveAsDraft || !onSaveAsDraft) return;
    setIsSaving(true);
    try {
      await onSaveAsDraft({
        entityType,
        title: title.trim(),
        structuredData: goldenTicketValue.trim()
          ? { [goldenTicketField]: goldenTicketValue.trim() }
          : {},
        sourceItemId,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl bg-gray-950 border-gray-800 text-gray-100">
        <DialogHeader className="border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
              {ARCHETYPE_ICONS[entityType]}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Extract Knowledge Entity
              </DialogTitle>
              <p className="text-sm text-gray-400 mt-1">
                Create a structured medical concept from this source
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Archetype Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">
              Entity Type
            </Label>
            <Select
              value={entityType}
              onValueChange={(v) => setEntityType(v as KnowledgeEntityType)}
            >
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {(Object.keys(ARCHETYPE_LABELS) as KnowledgeEntityType[]).map(
                  (type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      className="text-gray-100 focus:bg-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        {ARCHETYPE_ICONS[type]}
                        <span>{ARCHETYPE_LABELS[type]}</span>
                      </div>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-300">
              Title / Name
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Pulmonary Embolism, Metoprolol, S. aureus..."
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
              autoFocus
            />
          </div>

          {/* Golden Ticket Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Golden Ticket
                <span className="text-xs text-yellow-400/70">
                  (Required for recall)
                </span>
              </Label>
              {aiHint && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  {showHint ? (
                    <>
                      <EyeOff className="w-3 h-3 mr-1" />
                      Hide Hint
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      Reveal Hint
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 mb-2">
              <p className="text-sm text-gray-400 italic">
                "{goldenTicketPrompt}"
              </p>
            </div>

            <Textarea
              value={goldenTicketValue}
              onChange={(e) => setGoldenTicketValue(e.target.value)}
              placeholder="Type your answer here... (typing activates Generation Effect for memory)"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
            />

            {/* AI Hint (collapsible) */}
            {showHint && aiHint && (
              <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-yellow-400/70 mb-1">
                      AI Suggestion
                    </p>
                    <p className="text-sm text-yellow-100">{aiHint}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-gray-800 pt-4 flex justify-between gap-4">
          {/* Left: Save as Draft */}
          {onSaveAsDraft && (
            <Button
              variant="ghost"
              onClick={handleSaveAsDraft}
              disabled={!canSaveAsDraft || isSaving}
              className="mr-auto text-gray-400 hover:text-gray-200"
            >
              <FileText className="w-4 h-4 mr-2" />
              Save as Draft
              <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 font-mono text-[10px] text-gray-400">
                ⇧⌘↵
              </kbd>
            </Button>
          )}

          {/* Right: Cancel + Save */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-white"
            >
              Cancel
              <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 font-mono text-[10px] text-gray-400">
                ESC
              </kbd>
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Entity"}
              <kbd className="ml-2 hidden sm:inline-flex h-5 items-center gap-1 rounded border border-blue-400/30 bg-blue-500/20 px-1.5 font-mono text-[10px] text-blue-100">
                ⌘↵
              </kbd>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ArchetypeExtractionDialog;
