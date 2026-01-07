import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Link as LinkIcon, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { NotebookBlock } from '@/types';
import { useAppStore } from "@/stores/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotebookBlockProps {
  block: NotebookBlock;
  onRefresh: () => void;
}

export const NotebookBlockComponent: React.FC<NotebookBlockProps> = ({
  block,
}) => {
  const { setCurrentView } = useAppStore();
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  useEffect(() => {
    const fetchSource = async () => {
      if (!block.sourceItemId) return;

      setLoadingSource(true);
      try {
        const result = await window.api.sourceItems.getById(block.sourceItemId);
        if (result.data) {
          setSourceTitle(result.data.title);
        } else {
          setSourceTitle("Unknown Source");
        }
      } catch (err) {
        console.error("Error fetching source title:", err);
        setSourceTitle("Error loading source");
      } finally {
        setLoadingSource(false);
      }
    };

    fetchSource();
  }, [block.sourceItemId]);

  const handleSourceClick = () => {
    if (block.sourceItemId) {
      setCurrentView("knowledgebank", block.sourceItemId);
    }
  };

  return (
    <div className="group relative rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-200">
      {/* Header Row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
            <Layers className="w-3.5 h-3.5" />
            <span>Block {block.position + 1}</span>
          </div>

          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 font-semibold bg-primary/10 text-primary border-none"
          >
            {block.cardCount || 0} {block.cardCount === 1 ? "card" : "cards"}
          </Badge>

          {block.sourceItemId && (
            <button
              onClick={handleSourceClick}
              className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 hover:bg-muted px-2 py-0.5 rounded-full border border-border/50 transition-colors"
            >
              <LinkIcon className="w-3 h-3" />
              <span className="max-w-[150px] truncate">
                {loadingSource ? "Loading..." : sourceTitle}
              </span>
              <ExternalLink className="w-2.5 h-2.5 opacity-50 ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {block.content}
      </div>

      {/* Footer / Actions */}
      <div className="mt-4 pt-3 border-t flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-8 gap-2 text-xs font-semibold grayscale opacity-70"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Generate Cards
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Coming in T42</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
