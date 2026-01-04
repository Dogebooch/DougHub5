'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Suggestion {
  id: string;
  concept: string;
  format: 'Cloze' | 'Q&A';
  checked: boolean;
}

export function CaptureInterface() {
  const [content, setContent] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: '1',
      concept: 'Troponin elevation indicates myocardial injury in acute coronary syndrome',
      format: 'Cloze',
      checked: false,
    },
    {
      id: '2',
      concept: 'What are the key ECG findings in STEMI vs NSTEMI?',
      format: 'Q&A',
      checked: false,
    },
    {
      id: '3',
      concept: 'First-line treatment for acute heart failure includes loop diuretics',
      format: 'Cloze',
      checked: false,
    },
  ]);

  const hasContent = content.trim().length > 0;
  const hasSelection = suggestions.some((s) => s.checked);

  const handleCheckboxChange = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  };

  const handleCreateCards = () => {
    if (!hasSelection) return;

    toast.success('Cards created!', {
      duration: 2000,
    });

    setContent('');
    setSuggestions((prev) => prev.map((s) => ({ ...s, checked: false })));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (hasSelection) {
          handleCreateCards();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSelection]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Textarea
        placeholder="Paste medical content here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[200px] text-base focus-visible:ring-blue-500"
      />

      {hasContent && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">
            Suggested Extractions
          </h3>

          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-start gap-3 rounded-md border border-border bg-background p-4 transition-colors hover:bg-accent/50"
              >
                <Checkbox
                  id={suggestion.id}
                  checked={suggestion.checked}
                  onCheckedChange={() => handleCheckboxChange(suggestion.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-2">
                  <label
                    htmlFor={suggestion.id}
                    className="text-sm font-medium leading-relaxed text-foreground cursor-pointer"
                  >
                    {suggestion.concept}
                  </label>
                </div>
                <Badge
                  variant={suggestion.format === 'Cloze' ? 'default' : 'secondary'}
                  className="shrink-0"
                >
                  {suggestion.format}
                </Badge>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Button
              onClick={handleCreateCards}
              disabled={!hasSelection}
              className="w-full"
              size="lg"
            >
              Create Cards
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
