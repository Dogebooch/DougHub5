import React from 'react';
import { BookOpen, FileText, Image, Mic, Zap, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SourceItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

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

  return (
    <div
      className={cn(
        "group flex items-center gap-4 py-2 px-4 transition-colors hover:bg-black/5 text-card-foreground",
        isSelected && "bg-primary/10",
        isHighlighted &&
          "bg-warning/10 border-l-4 border-l-warning animate-pulse-subtle"
      )}
    >
      <div className="flex items-center gap-4 shrink-0">
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
          <h3 className="font-medium text-sm truncate leading-none text-card-foreground flex-1">
            {displayTitle}
          </h3>
          <span className="text-[11px] text-card-muted whitespace-nowrap shrink-0 group-hover:hidden">
            {formatDistanceToNow(new Date(sourceItem.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 group-hover:hidden">
          {/* Subject badge if available */}
          {sourceItem.metadata?.subject && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[11px] font-normal bg-primary/10 text-primary border-none"
            >
              {sourceItem.metadata.subject}
            </Badge>
          )}
          {/* Question type badge if available */}
          {sourceItem.metadata?.questionType && (
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[11px] font-normal bg-secondary/50 text-secondary-foreground border-none"
            >
              {sourceItem.metadata.questionType}
            </Badge>
          )}
        </div>
      </div>

      <div className="items-center gap-2 hidden group-hover:flex focus-within:flex whitespace-nowrap shrink-0">
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
