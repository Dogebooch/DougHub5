import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { SuggestedCardItem } from './SuggestedCardItem';
import type { TopicCardSuggestion } from '@/types/electron';
import type { NotebookBlock } from '@/types';

interface TopicCardGenerationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicName: string;
  topicPageId: string;
  blocks: NotebookBlock[];
  onCardsCreated?: () => void;
}

interface EditedSuggestion extends TopicCardSuggestion {
  _edited?: boolean;
  _removed?: boolean;
}

export function TopicCardGeneration({
  open,
  onOpenChange,
  topicName,
  topicPageId,
  blocks,
  onCardsCreated,
}: TopicCardGenerationProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<EditedSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  // Generate unique key for each suggestion
  const getSuggestionKey = (s: TopicCardSuggestion, idx: number) =>
    `${s.blockId}-${idx}`;

  // Fetch suggestions when modal opens
  const fetchSuggestions = useCallback(async () => {
    if (!blocks || blocks.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const blocksPayload = blocks.map((b) => ({
        id: b.id,
        content: b.content,
        userInsight: b.userInsight,
        calloutType: b.calloutType,
      }));

      const result = await window.api.ai.generateCardsFromTopic(
        topicName,
        blocksPayload
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        setSuggestions(result.data);
        // Auto-select all suggestions with green/yellow worthiness
        const autoSelect = new Set<string>();
        result.data.forEach((s, idx) => {
          const hasRed =
            s.worthiness.testable === 'red' ||
            s.worthiness.oneConcept === 'red' ||
            s.worthiness.discriminative === 'red';
          if (!hasRed) {
            autoSelect.add(getSuggestionKey(s, idx));
          }
        });
        setSelectedIds(autoSelect);
      }
    } catch (err) {
      console.error('Failed to generate cards:', err);
      setError('Failed to generate card suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [blocks, topicName]);

  useEffect(() => {
    if (open) {
      fetchSuggestions();
    } else {
      // Reset on close
      setSuggestions([]);
      setSelectedIds(new Set());
      setError(null);
    }
  }, [open, fetchSuggestions]);

  // Filter out removed suggestions
  const visibleSuggestions = suggestions.filter((s) => !s._removed);

  const toggleSelect = (key: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleSuggestions.length) {
      setSelectedIds(new Set());
    } else {
      const allKeys = new Set<string>();
      visibleSuggestions.forEach((s, idx) => {
        allKeys.add(getSuggestionKey(s, suggestions.indexOf(s)));
      });
      setSelectedIds(allKeys);
    }
  };

  const handleEdit = (index: number, updates: { front: string; back: string }) => {
    setSuggestions((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, ...updates, _edited: true } : s
      )
    );
  };

  const handleRemove = (index: number) => {
    const key = getSuggestionKey(suggestions[index], index);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, _removed: true } : s))
    );
  };

  const handleCreateCards = async () => {
    const toCreate = suggestions.filter(
      (s, idx) => !s._removed && selectedIds.has(getSuggestionKey(s, idx))
    );

    if (toCreate.length === 0) {
      toast({
        title: 'No cards selected',
        description: 'Please select at least one card to create.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      let created = 0;
      let failed = 0;

      for (const suggestion of toCreate) {
        try {
          const cardData = {
            front: suggestion.front,
            back: suggestion.back || '',
            cardType: suggestion.format === 'cloze' || suggestion.format === 'overlapping-cloze'
              ? 'cloze'
              : 'qa',
            notebookTopicPageId: topicPageId,
            sourceBlockId: suggestion.blockId,
            tags: [],
          };

          const result = await window.api.cards.create(cardData);
          if (result.error) {
            console.error('Failed to create card:', result.error);
            failed++;
          } else {
            created++;
          }
        } catch (err) {
          console.error('Error creating card:', err);
          failed++;
        }
      }

      if (created > 0) {
        toast({
          title: 'Cards created',
          description: `Successfully created ${created} card${created !== 1 ? 's' : ''}${failed > 0 ? `. ${failed} failed.` : '.'}`,
        });
        onCardsCreated?.();
        onOpenChange(false);
      } else {
        toast({
          title: 'Failed to create cards',
          description: 'All card creations failed. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const selectedCount = [...selectedIds].filter((key) =>
    visibleSuggestions.some(
      (s, idx) => getSuggestionKey(s, suggestions.indexOf(s)) === key
    )
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Generate Cards: {topicName}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Analyzing {blocks.length} block{blocks.length !== 1 ? 's' : ''}...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Failed to generate suggestions</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchSuggestions} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : visibleSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <Info className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">No card suggestions</p>
                <p className="text-xs text-muted-foreground">
                  The AI couldn't identify card-worthy content in this topic.
                  Try adding more specific content.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedCount === visibleSuggestions.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedCount === visibleSuggestions.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {visibleSuggestions.length} suggestion{visibleSuggestions.length !== 1 ? 's' : ''}
                </p>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {suggestions.map((suggestion, idx) => {
                    if (suggestion._removed) return null;
                    const key = getSuggestionKey(suggestion, idx);
                    return (
                      <SuggestedCardItem
                        key={key}
                        suggestion={suggestion}
                        index={idx}
                        selected={selectedIds.has(key)}
                        onToggleSelect={() => toggleSelect(key)}
                        onEdit={(updates) => handleEdit(idx, updates)}
                        onRemove={() => handleRemove(idx)}
                      />
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <Info className="h-3 w-3 flex-shrink-0" />
                <span>
                  Uncheck cards you don't want. Click Edit to modify before creating.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              {selectedCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedCount} of {visibleSuggestions.length} selected
                </span>
              )}
              <Button
                onClick={handleCreateCards}
                disabled={loading || selectedCount === 0 || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Create {selectedCount} Card{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
