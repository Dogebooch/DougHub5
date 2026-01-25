import React from 'react';
import { Pencil } from 'lucide-react';
import { NotebookBlock } from '@/types';
import { CalloutBlock } from './CalloutBlock';

interface ArticleContentProps {
  blocks: NotebookBlock[];
  onFootnoteClick?: (sourceItemId: string) => void;
  onBlockEdit?: (block: NotebookBlock) => void;
}

/**
 * ArticleContent
 *
 * Renders notebook blocks as flowing prose without visible boundaries.
 * Blocks with calloutType render as styled callout boxes.
 * Each block gets a footnote superscript linking to its source.
 */
export function ArticleContent({ blocks, onFootnoteClick, onBlockEdit }: ArticleContentProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No content yet.</p>
        <p className="text-xs mt-1">Add content from your Archive to get started.</p>
      </div>
    );
  }

  return (
    <article className="prose prose-stone dark:prose-invert max-w-none">
      {blocks.map((block, index) => {
        const footnoteNum = index + 1;
        const displayContent = block.userInsight || block.content;

        // Determine callout type: explicit or auto-detected from AI evaluation
        const calloutType: 'pearl' | 'trap' | 'caution' | null =
          block.calloutType ||
          (block.aiEvaluation?.examTrapType ? 'trap' : null);

        const FootnoteSup = (
          <sup
            className="ml-1 text-primary cursor-pointer hover:underline text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onFootnoteClick?.(block.sourceItemId);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onFootnoteClick?.(block.sourceItemId);
              }
            }}
          >
            {footnoteNum}
          </sup>
        );

        if (calloutType) {
          return (
            <CalloutBlock
              key={block.id}
              type={calloutType}
              onClick={onBlockEdit ? () => onBlockEdit(block) : undefined}
            >
              <span>{displayContent}</span>
              {FootnoteSup}
            </CalloutBlock>
          );
        }

        return (
          <div
            key={block.id}
            className="group relative cursor-pointer hover:bg-muted/30 rounded-md -mx-2 px-2 py-1 mb-3 transition-colors"
            onClick={() => onBlockEdit?.(block)}
          >
            <p className="text-base leading-relaxed text-foreground/90">
              {displayContent}
              {FootnoteSup}
            </p>
            {onBlockEdit && (
              <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        );
      })}
    </article>
  );
}
