import React from 'react';
import {
  BookOpen,
  FileText,
  Image,
  Mic,
  Zap,
  Edit,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SourceItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Clean display names for source labels */
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  PeerPrep: "PEERPrep",
  MKSAP: "MKSAP",
  UWorld: "UWorld",
  Amboss: "Amboss",
  BoardVitals: "BoardVitals",
  Rosh: "Rosh Review",
  NEJM: "NEJM",
  UpToDate: "UpToDate",
};

interface SourceItemRowProps {
  sourceItem: SourceItem;
  isSelected: boolean;
  isHighlighted?: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onAddToNotebook: (item: SourceItem) => void;
  onViewInNotebook?: (item: SourceItem) => void;
  onOpen: (item: SourceItem) => void;
  onDelete: (item: SourceItem) => void;
}

export const SourceItemRow: React.FC<SourceItemRowProps> = ({
  sourceItem,
  isSelected,
  isHighlighted,
  onToggleSelect,
  onAddToNotebook,
  onViewInNotebook,
  onOpen,
  onDelete,
}) => {
  const getIcon = () => {
    switch (sourceItem.sourceType) {
      case "qbank":
        return <BookOpen className="h-4 w-4 text-card-muted" />;
      case "article":
      case "pdf":
        return <FileText className="h-4 w-4 text-card-muted" />;
      case "image":
        return <Image className="h-4 w-4 text-card-muted" />;
      case "audio":
        return <Mic className="h-4 w-4 text-card-muted" />;
      case "quickcapture":
        return <Zap className="h-4 w-4 text-card-muted" />;
      case "manual":
        return <Edit className="h-4 w-4 text-card-muted" />;
      default:
        return <FileText className="h-4 w-4 text-card-muted" />;
    }
  };

  // For qbank items: use AI summary as title if available, otherwise use original title
  const displayTitle =
    sourceItem.sourceType === "qbank" && sourceItem.metadata?.summary
      ? sourceItem.metadata.summary
      : sourceItem.title;

  // Get source display label for qbank items
  const sourceLabel = React.useMemo(() => {
    if (sourceItem.sourceType !== "qbank") return null;
    const name = sourceItem.sourceName?.toLowerCase() || "";
    for (const [key, label] of Object.entries(SOURCE_DISPLAY_NAMES)) {
      if (name.includes(key.toLowerCase())) return label;
    }
    return sourceItem.sourceName; // Fallback to raw name
  }, [sourceItem.sourceName, sourceItem.sourceType]);

  // Get wasCorrect from rawContent for qbank items
  const wasCorrect = React.useMemo(() => {
    if (sourceItem.sourceType !== "qbank") return null;
    try {
      const content = JSON.parse(sourceItem.rawContent);
      return content.wasCorrect;
    } catch {
      return null;
    }
  }, [sourceItem.sourceType, sourceItem.rawContent]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(sourceItem)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(sourceItem);
        }
      }}
      className={cn(
        "group flex items-center gap-4 py-2 px-4 transition-colors hover:bg-black/5 text-card-foreground min-w-0 overflow-hidden relative cursor-pointer outline-none focus-visible:bg-black/5",
        isSelected && "bg-primary/10",
        isHighlighted &&
          "bg-warning/10 border-l-4 border-l-warning animate-pulse-subtle"
      )}
    >
      <div
        className="flex items-center gap-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) =>
            onToggleSelect(sourceItem.id, !!checked)
          }
          aria-label={`Select ${sourceItem.title}`}
          className="border-card-muted/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <div className="p-2 rounded-lg bg-black/5 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
      </div>

      <div className="flex-grow min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-medium text-sm truncate leading-normal text-card-foreground flex-1">
            {sourceLabel && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold bg-card-muted/10 text-card-muted/60 mr-2 tracking-tight uppercase border border-card-muted/5">
                {sourceLabel}
              </span>
            )}
            {displayTitle}
          </h3>
          <span className="text-[11px] text-card-muted whitespace-nowrap shrink-0 group-hover:hidden">
            {formatDistanceToNow(new Date(sourceItem.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        <div className="flex items-center gap-1.5 group-hover:hidden">
          {/* Subject badge if available */}
          {sourceItem.metadata?.subject && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-normal bg-primary/10 text-primary border-none"
            >
              {sourceItem.metadata.subject}
            </Badge>
          )}
          {/* Correct/Incorrect indicator for qbank items */}
          {wasCorrect !== null &&
            (wasCorrect ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <X className="h-3.5 w-3.5 text-destructive" />
            ))}
        </div>
      </div>

      <div
        className="items-center gap-2 hidden group-hover:flex focus-within:flex whitespace-nowrap shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs font-medium border-border/30 text-card-muted bg-transparent hover:bg-card-muted/10 hover:text-card-foreground shadow-none"
          onClick={() => onOpen(sourceItem)}
        >
          Open
        </Button>
        {sourceItem.status === "curated" && onViewInNotebook && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs font-medium"
            onClick={() => onViewInNotebook(sourceItem)}
          >
            <span className="hidden sm:inline">View in </span>Notebook
          </Button>
        )}
        <Button
          size="sm"
          className="h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          onClick={() => onAddToNotebook(sourceItem)}
        >
          Add<span className="hidden sm:inline"> to Notebook</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(sourceItem)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
