import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Sparkles, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CardSuggestion, CardFormat, WorthinessResult } from '@/types/ai';
import { CardWorthinessPanel } from './CardWorthinessPanel';

interface CardGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  blockId: string;
  blockContent: string;      // full block for AI context
  topicName: string;         // for display + AI context
  notebookTopicPageId: string; // for card provenance
  onCreateCard: (data: {
    format: CardFormat;
    front: string;
    back: string;
    worthiness: WorthinessResult;
  }) => void;
}

const FORMAT_OPTIONS = [
  { value: 'qa', label: 'Q&A', description: 'Question and answer' },
  { value: 'cloze', label: 'Cloze', description: 'Fill in the blank' },
  { value: 'overlapping-cloze', label: 'Overlapping Cloze', description: 'For lists (prevents sibling interference)' },
  { value: 'image-occlusion', label: 'Image Occlusion', description: 'Hide parts of an image' },
  { value: 'procedural', label: 'Procedural', description: 'Step-by-step procedure' },
];

export const CardGenerationModal: React.FC<CardGenerationModalProps> = ({
  open,
  onOpenChange,
  selectedText,
  blockId,
  blockContent,
  topicName,
  notebookTopicPageId,
  onCreateCard
}) => {
  // State
  const [suggestions, setSuggestions] = useState<CardSuggestion[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [userIntent, setUserIntent] = useState('');
  const [showIntent, setShowIntent] = useState(false);
  
  const [editedFront, setEditedFront] = useState('');
  const [editedBack, setEditedBack] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  
  const [showFullText, setShowFullText] = useState(false);

  // Fetch suggestions
  const fetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.ai.generateCards(blockContent, topicName, userIntent);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setSuggestions(result.data);
        setSelectedIndex(0);
        if (result.data.length > 0) {
          setEditedFront(result.data[0].front);
          setEditedBack(result.data[0].back);
          setIsDirty(false);
        }
      }
    } catch (err) {
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSuggestions();
    } else {
      // Reset state when closed
      setSuggestions(null);
      setSelectedIndex(0);
      setError(null);
      setUserIntent('');
      setShowIntent(false);
      setIsDirty(false);
    }
    // Only re-fetch when modal opens with new content, not on every prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blockContent]);

  // Sync edits when selection or suggestions change
  useEffect(() => {
    if (suggestions && suggestions[selectedIndex]) {
      const current = suggestions[selectedIndex];
      setEditedFront(current.front);
      setEditedBack(current.back);
      setIsDirty(false);
    }
  }, [suggestions, selectedIndex]);

  const currentSuggestion = suggestions?.[selectedIndex] || null;

  const handleCreateCard = () => {
    if (!currentSuggestion) return;
    onCreateCard({
      format: currentSuggestion.format,
      front: editedFront,
      back: editedBack,
      worthiness: currentSuggestion.worthiness
    });
    onOpenChange(false);
  };

  const handleFormatChange = (format: CardFormat) => {
    if (!suggestions) return;
    
    // Find if we have a suggestion for this format already
    const existingIndex = suggestions.findIndex(s => s.format === format);
    if (existingIndex !== -1) {
      setSelectedIndex(existingIndex);
    } else {
      // If we don't have a suggestion for this specific format, 
      // we might want to tell the AI to regenerate or just update the format type locally.
      // For now, let's just update the local suggestion format if possible, or keep as is.
      // Per instructions: "if AI provided a suggestion for that format, use it; otherwise keep current front/back"
      
      // We'll update the current suggestion object (locally)
      const updatedSuggestions = [...suggestions];
      updatedSuggestions[selectedIndex] = {
        ...updatedSuggestions[selectedIndex],
        format: format
      };
      setSuggestions(updatedSuggestions);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter always works
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleCreateCard();
    }
    // Plain Enter only works if not in a textarea
    if (e.key === 'Enter' && !e.ctrlKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleCreateCard();
    }
  };

  const isLongText = selectedText.length > 150;
  const displayText = showFullText ? selectedText : selectedText.slice(0, 100) + (isLongText ? '...' : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <DialogTitle>Generate Card</DialogTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Topic: {topicName}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          {/* Selected Text Preview */}
          <div className="bg-muted/30 border border-border/50 rounded-md p-3 text-sm italic relative group">
            <div className="text-muted-foreground line-clamp-3 group-hover:line-clamp-none">
              &quot;{displayText}&quot;
            </div>
            {isLongText && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="text-xs text-primary mt-1 hover:underline"
              >
                {showFullText ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {/* User Intent / Context */}
          <div className="space-y-2">
            {!showIntent ? (
              <button
                onClick={() => setShowIntent(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Info className="w-3 h-3" />
                Add learning context (why learn this?)
              </button>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <Label htmlFor="intent" className="text-xs font-semibold">
                  Learning Context
                </Label>
                <div className="relative">
                  <Textarea
                    id="intent"
                    placeholder="e.g., I keep confusing this with X, or focus on initial management..."
                    value={userIntent}
                    onChange={(e) => setUserIntent(e.target.value)}
                    className="text-sm h-16 min-h-[40px]"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-1 right-1 h-6 text-[11px]"
                    onClick={fetchSuggestions}
                    disabled={isLoading}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </div>

          <hr className="border-border/40" />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">
                Analyzing selection...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Failed to generate suggestions
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchSuggestions} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : currentSuggestion ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Format Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Card Format</Label>
                <Select
                  value={currentSuggestion.format}
                  onValueChange={(v) => handleFormatChange(v as CardFormat)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col items-start py-1">
                          <span className="text-sm font-medium">
                            {opt.label}
                            {opt.value === suggestions?.[0]?.format && (
                              <span className="ml-2 text-[11px] text-primary/70 font-normal underline decoration-primary/30 underline-offset-2">
                                (Recommended)
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground leading-tight">
                            {opt.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Edit Preview */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="front"
                    className="text-xs font-semibold flex justify-between"
                  >
                    Front
                    {currentSuggestion.confidence < 0.6 && (
                      <span className="text-[11px] text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Low confidence - review carefully
                      </span>
                    )}
                  </Label>
                  <Textarea
                    id="front"
                    value={editedFront}
                    onChange={(e) => {
                      setEditedFront(e.target.value);
                      setIsDirty(true);
                    }}
                    className="text-sm min-h-[60px]"
                  />
                </div>
                {currentSuggestion.format !== "cloze" &&
                  currentSuggestion.format !== "overlapping-cloze" && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="back"
                        className="text-xs font-semibold text-muted-foreground"
                      >
                        Back
                      </Label>
                      <Textarea
                        id="back"
                        value={editedBack}
                        onChange={(e) => {
                          setEditedBack(e.target.value);
                          setIsDirty(true);
                        }}
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  )}
              </div>

              {/* Worthiness Panel */}
              <div className="pt-2">
                <CardWorthinessPanel
                  worthiness={currentSuggestion.worthiness}
                />
              </div>

              {/* Format Change Warning */}
              {isDirty && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Info className="w-3 h-3" />
                  You have manual edits. Changing format or suggestion will
                  overwrite them.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t pt-4 flex sm:justify-between items-center bg-background">
          <div className="flex items-center gap-2">
            {suggestions && suggestions.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 p-0"
                  disabled={selectedIndex === 0 || isLoading}
                  onClick={() => setSelectedIndex((prev) => prev - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span>
                  {selectedIndex + 1} of {suggestions.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 p-0"
                  disabled={
                    selectedIndex === suggestions.length - 1 || isLoading
                  }
                  onClick={() => setSelectedIndex((prev) => prev + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              Skip
            </Button>
          </div>

          <Button
            onClick={handleCreateCard}
            disabled={isLoading || !currentSuggestion}
            size="sm"
            className="px-6"
          >
            Create Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
