import { useState, useEffect } from "react";
import { Loader2, BookOpen, AlertCircle } from "lucide-react";
import { NotebookBlock } from "@/types";
import { cn } from "@/lib/utils";

interface ExistingBlocksListProps {
  topicId: string | null;
  className?: string;
}

interface BlockWithSource extends NotebookBlock {
  sourceTitle?: string;
}

export function ExistingBlocksList({ topicId, className }: ExistingBlocksListProps) {
  const [blocks, setBlocks] = useState<BlockWithSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let ignore = false;

    if (!topicId) {
      setBlocks([]);
      setIsError(false);
      return;
    }

    const fetchBlocks = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        // First, get the notebook page for this topic
        const pagesResult = await window.api.notebookPages.getAll();
        if (ignore) return;
        
        if (!pagesResult.data) {
          if (pagesResult.error) throw new Error(pagesResult.error);
          setBlocks([]);
          return;
        }

        const page = pagesResult.data.find((p) => p.canonicalTopicId === topicId);
        if (!page) {
          setBlocks([]);
          return;
        }

        // Get blocks for this page
        const blocksResult = await window.api.notebookBlocks.getByPage(page.id);
        if (ignore) return;

        if (!blocksResult.data) {
          if (blocksResult.error) throw new Error(blocksResult.error);
          setBlocks([]);
          return;
        }

        // Fetch source titles for each block in parallel
        // Optimization note: This is an N+1 pattern that could be improved with a joined query in the DB/IPC layer
        const blocksWithSources: BlockWithSource[] = await Promise.all(
          blocksResult.data.map(async (block) => {
            const sourceResult = await window.api.sourceItems.getById(block.sourceItemId);
            return {
              ...block,
              sourceTitle: sourceResult.data?.title || "Unknown source",
            };
          })
        );

        if (!ignore) {
          setBlocks(blocksWithSources);
        }
      } catch (error) {
        console.error("Failed to fetch existing blocks:", error);
        if (!ignore) {
          setIsError(true);
          setBlocks([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchBlocks();

    return () => {
      ignore = true;
    };
  }, [topicId]);

  // Don't render anything if no topic selected
  if (!topicId) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-6 text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm">Loading existing insights...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={cn("flex items-center gap-2 py-4 text-destructive text-sm", className)}>
        <AlertCircle className="h-4 w-4" />
        <span>Failed to load previous entries for this topic.</span>
      </div>
    );
  }

  // Empty state
  if (blocks.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 py-4 text-muted-foreground", className)}>
        <BookOpen className="h-4 w-4" />
        <span className="text-sm italic">
          No entries yet in this topic. You'll be the first!
        </span>
      </div>
    );
  }

  // Truncate insight to ~100 chars with ellipsis
  const truncateInsight = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
        Already in this topic:
      </h4>
      <div className="rounded-md border bg-muted/30 divide-y max-h-[150px] overflow-y-auto scrollbar-thin">
        {blocks.map((block) => (
          <div key={block.id} className="px-3 py-2.5 hover:bg-muted/50 transition-colors">
            <p className="text-sm leading-relaxed text-foreground/90">
              • "{truncateInsight(block.content)}"
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 flex items-center gap-1">
              <span className="opacity-70">From:</span> {block.sourceTitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
