import React from 'react';
import { Button } from '@/components/ui/button';

interface SourceFootnote {
  number: number;           // Superscript number (1, 2, 3...)
  sourceItemId: string;
  title: string;            // Source title or summary
  siteName?: string;        // e.g., "UWorld", "MKSAP"
}

interface SourceFootnotesProps {
  footnotes: SourceFootnote[];
  onViewSource: (sourceItemId: string) => void;
}

export function SourceFootnotes({ footnotes, onViewSource }: SourceFootnotesProps) {
  if (!footnotes || footnotes.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-border/30">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Sources
      </h3>
      <div className="space-y-2">
        {footnotes.map((fn) => (
          <div key={fn.number} className="flex items-start justify-between text-sm">
            <div className="flex items-start gap-2">
              <sup className="text-primary font-medium mt-1">{fn.number}</sup>
              <span className="text-foreground/80">
                {fn.title}
                {fn.siteName && (
                  <span className="text-muted-foreground ml-1">— {fn.siteName}</span>
                )}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80 shrink-0 h-auto py-1"
              onClick={() => onViewSource(fn.sourceItemId)}
            >
              View Source →
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
