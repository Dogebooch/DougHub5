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
  onToggleSelect: (id: string, checked: boolean) => void;
  onAddToNotebook: (item: SourceItem) => void;
  onOpen: (item: SourceItem) => void;
  onDelete: (item: SourceItem) => void;
}

export const SourceItemRow: React.FC<SourceItemRowProps> = ({
  sourceItem,
  isSelected,
  onToggleSelect,
  onAddToNotebook,
  onOpen,
  onDelete,
}) => {
  const getIcon = () => {
    switch (sourceItem.sourceType) {
      case 'qbank':
        return <BookOpen className="h-4 w-4 text-muted-foreground" />;
      case 'article':
      case 'pdf':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'image':
        return <Image className="h-4 w-4 text-muted-foreground" />;
      case 'audio':
        return <Mic className="h-4 w-4 text-muted-foreground" />;
      case 'quickcapture':
        return <Zap className="h-4 w-4 text-muted-foreground" />;
      case 'manual':
        return <Edit className="h-4 w-4 text-muted-foreground" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const tags = sourceItem.tags || [];
  const displayedTags = tags.slice(0, 3);
  const remainingTagsCount = tags.length - 3;

  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-4 border-b transition-colors hover:bg-muted/30',
        isSelected && 'bg-primary/5 border-primary/20'
      )}
    >
      <div className="flex items-center gap-4 shrink-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(sourceItem.id, !!checked)}
          aria-label={`Select ${sourceItem.title}`}
        />
        <div className="p-2 rounded-lg bg-muted flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      <div className="flex-grow min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate leading-none">
            {sourceItem.title}
          </h3>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(sourceItem.createdAt), { addSuffix: true })}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {displayedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
              {tag}
            </Badge>
          ))}
          {remainingTagsCount > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
              +{remainingTagsCount}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity whitespace-nowrap">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs font-medium"
          onClick={() => onOpen(sourceItem)}
        >
          Open
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs font-medium bg-primary hover:bg-primary/90"
          onClick={() => onAddToNotebook(sourceItem)}
        >
          Add to Notebook
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
