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
import { cn } from "@/lib/utils";

interface NotebookBlockProps {
  block: NotebookBlock;
  onRefresh: () => void;
  onGenerateCard: (text: string) => void;
}

export const NotebookBlockComponent: React.FC<NotebookBlockProps> = ({
  block,
  onGenerateCard,
}) => {
  const { setCurrentView } = useAppStore();
  const [sourceTitle, setSourceTitle] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Selection state
  const [selectionData, setSelectionData] = useState<{
    text: string;
    x: number;
    y: number;
    show: boolean;
    isAbove: boolean;
  }>({ text: "", x: 0, y: 0, show: false, isAbove: true });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleSelectionUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !contentRef.current) {
          setSelectionData((prev) => ({ ...prev, show: false }));
          return;
        }

        const selectedText = selection.toString().trim();
        if (selectedText.length < 10) {
          setSelectionData((prev) => ({ ...prev, show: false }));
          return;
        }

        // Ensure selection is within THIS block
        if (!contentRef.current.contains(selection.anchorNode)) {
          return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Calculate if we have space above (button ~40px)
        const isAbove = rect.top > 50;
        const x = rect.left + rect.width / 2;
        const y = isAbove ? rect.top - 10 : rect.bottom + 10;

        setSelectionData({
          text: selectedText,
          x,
          y,
          show: true,
          isAbove,
        });
      }, 200);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Hide button immediately when starting a new click/drag
      // unless clicking the button itself
      if (!(e.target as HTMLElement).closest(".selection-trigger")) {
        setSelectionData((prev) => ({ ...prev, show: false }));
      }
    };

    const handleScroll = () => {
      setSelectionData((prev) => ({ ...prev, show: false }));
    };

    document.addEventListener("mouseup", handleSelectionUpdate);
    document.addEventListener("keyup", handleSelectionUpdate);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mouseup", handleSelectionUpdate);
      document.removeEventListener("keyup", handleSelectionUpdate);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", handleScroll, true);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleGenerateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onGenerateCard(selectionData.text);
    window.getSelection()?.removeAllRanges();
    setSelectionData((prev) => ({ ...prev, show: false }));
  };

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
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-200",
        (block.cardCount ?? 0) > 0 && "border-l-2 border-l-primary/40"
      )}
    >
      {/* Header Row */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-card-muted uppercase tracking-tight">
            <Layers className="w-3.5 h-3.5" />
            <span>Block {block.position + 1}</span>
          </div>

          <Badge
            variant="secondary"
            className={cn(
              "text-[11px] px-1.5 py-0 h-4 font-semibold border-none transition-colors",
              (block.cardCount ?? 0) > 0
                ? "bg-primary/20 text-primary"
                : "bg-primary/10 text-card-muted"
            )}
            title={
              (block.cardCount ?? 0) > 0
                ? `${block.cardCount} cards created from this block`
                : "No cards created yet"
            }
          >
            {block.cardCount || 0} {block.cardCount === 1 ? "card" : "cards"}
          </Badge>

          {block.sourceItemId && (
            <button
              onClick={handleSourceClick}
              className="flex items-center gap-1 text-[11px] text-card-muted bg-muted/50 hover:bg-muted px-2 py-0.5 rounded-full border border-border/50 transition-colors"
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
      <div
        ref={contentRef}
        className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed"
      >
        {block.content}
      </div>

      {/* Floating Selection Trigger */}
      {selectionData.show && (
        <div
          className="selection-trigger fixed z-[100] transition-all duration-200 pointer-events-auto"
          style={{
            left: selectionData.x,
            top: selectionData.y,
            transform: `translateX(-50%) translateY(${
              selectionData.isAbove ? "-100%" : "0"
            })`,
          }}
        >
          <Button
            size="sm"
            className="h-8 gap-2 shadow-lg animate-in fade-in zoom-in duration-200"
            onClick={handleGenerateClick}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Card
          </Button>
        </div>
      )}

      {/* Footer hint */}
      <div className="mt-4 pt-3 border-t">
        <p className="text-[11px] text-muted-foreground text-center">
          Select text above to generate cards
        </p>
      </div>
    </div>
  );
};
