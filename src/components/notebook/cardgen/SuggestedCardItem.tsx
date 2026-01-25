import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Pencil,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  X,
} from 'lucide-react';
import type { TopicCardSuggestion } from '@/types/electron';

interface SuggestedCardItemProps {
  suggestion: TopicCardSuggestion;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: (updates: { front: string; back: string }) => void;
  onRemove: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  qa: 'Q&A',
  cloze: 'Cloze',
  'overlapping-cloze': 'Overlapping Cloze',
  procedural: 'Procedural',
};

export function SuggestedCardItem({
  suggestion,
  index,
  selected,
  onToggleSelect,
  onEdit,
  onRemove,
}: SuggestedCardItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedFront, setEditedFront] = React.useState(suggestion.front);
  const [editedBack, setEditedBack] = React.useState(suggestion.back);
  const [expanded, setExpanded] = React.useState(false);

  // Overall worthiness indicator
  const getOverallStatus = () => {
    const levels = [
      suggestion.worthiness.testable,
      suggestion.worthiness.oneConcept,
      suggestion.worthiness.discriminative,
    ];
    if (levels.includes('red')) return 'red';
    if (levels.includes('yellow')) return 'yellow';
    return 'green';
  };

  const overallStatus = getOverallStatus();

  const statusConfig = {
    green: {
      color: 'bg-success',
      textColor: 'text-success',
      Icon: CheckCircle2,
    },
    yellow: {
      color: 'bg-warning',
      textColor: 'text-warning',
      Icon: AlertCircle,
    },
    red: {
      color: 'bg-destructive',
      textColor: 'text-destructive',
      Icon: XCircle,
    },
  };

  const config = statusConfig[overallStatus];

  const handleSaveEdit = () => {
    onEdit({ front: editedFront, back: editedBack });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedFront(suggestion.front);
    setEditedBack(suggestion.back);
    setIsEditing(false);
  };

  const isCloze = suggestion.format === 'cloze' || suggestion.format === 'overlapping-cloze';

  return (
    <div
      className={cn(
        'border rounded-lg transition-all',
        selected
          ? 'border-primary/50 bg-primary/5'
          : 'border-border/50 bg-card hover:border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {FORMAT_LABELS[suggestion.format] || suggestion.format}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Card {index + 1}
            </span>
            <div className={cn('h-2 w-2 rounded-full', config.color)} />
          </div>

          {isEditing ? (
            <div className="space-y-2 mt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Front
                </label>
                <Textarea
                  value={editedFront}
                  onChange={(e) => setEditedFront(e.target.value)}
                  className="mt-1 text-sm min-h-[60px]"
                />
              </div>
              {!isCloze && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Back
                  </label>
                  <Textarea
                    value={editedBack}
                    onChange={(e) => setEditedBack(e.target.value)}
                    className="mt-1 text-sm min-h-[60px]"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium line-clamp-2">
                {suggestion.front}
              </p>
              {!isCloze && suggestion.back && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {suggestion.back}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable Details */}
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground border-t border-border/30">
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                expanded && 'rotate-180'
              )}
            />
            {expanded ? 'Hide' : 'Show'} details
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 text-xs">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    statusConfig[suggestion.worthiness.testable].color
                  )}
                />
                <span className="text-muted-foreground">Testable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    statusConfig[suggestion.worthiness.oneConcept].color
                  )}
                />
                <span className="text-muted-foreground">One Concept</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    statusConfig[suggestion.worthiness.discriminative].color
                  )}
                />
                <span className="text-muted-foreground">Discriminative</span>
              </div>
            </div>
            <p className="text-muted-foreground italic">
              {suggestion.formatReason}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
