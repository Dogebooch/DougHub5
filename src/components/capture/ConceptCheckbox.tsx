import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { ExtractedConcept } from "@/types/ai";
import { cn } from "@/lib/utils";

interface ConceptCheckboxProps {
  concept: ExtractedConcept & { isValidating?: boolean };
  isSelected: boolean;
  onToggle: () => void;
  onEdit: (updates: Partial<ExtractedConcept>) => void;
}

export function ConceptCheckbox({
  concept,
  isSelected,
  onToggle,
  onEdit,
}: ConceptCheckboxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(concept.text);

  const handleSaveEdit = () => {
    if (editText.trim()) {
      onEdit({ text: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(concept.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleFormatChange = (format: "qa" | "cloze") => {
    onEdit({ suggestedFormat: format });
  };

  // Confidence indicator color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-success-foreground";
    if (confidence >= 0.5) return "text-yellow-700";
    return "text-destructive";
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected
          ? "bg-primary/5 border-primary/20"
          : "bg-background border-border hover:bg-muted/50"
      )}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " && !isEditing) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Checkbox */}
      <Checkbox
        id={`concept-${concept.id}`}
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
        aria-label={`Select concept: ${concept.text}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-success-foreground"
              onClick={handleSaveEdit}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleCancelEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <label
              htmlFor={`concept-${concept.id}`}
              className="text-sm font-medium leading-relaxed cursor-pointer flex-1"
            >
              {concept.text}
            </label>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setIsEditing(true)}
              aria-label="Edit concept"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Concept type badge */}
          <Badge variant="outline" className="text-xs capitalize">
            {concept.conceptType}
          </Badge>

          {/* Format selector */}
          <Select
            value={concept.suggestedFormat}
            onValueChange={(v) => handleFormatChange(v as "qa" | "cloze")}
          >
            <SelectTrigger className="h-6 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qa">Q&A</SelectItem>
              <SelectItem value="cloze">Cloze</SelectItem>
            </SelectContent>
          </Select>

          {/* Confidence indicator */}
          <span
            className={cn("text-xs", getConfidenceColor(concept.confidence))}
          >
            {Math.round(concept.confidence * 100)}% confidence
          </span>

          {/* Validating indicator */}
          {concept.isValidating && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Validating...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
