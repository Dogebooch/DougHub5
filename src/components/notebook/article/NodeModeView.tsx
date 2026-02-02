import React from "react";
import { NotebookBlock } from "@/types";
import {
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NodeModeViewProps {
  blocks: NotebookBlock[];
  activeNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  archetype?: string;
  onAddBlock?: (index: number) => void;
  onDeleteBlock?: (id: string) => void;
  onEditBlock?: (block: NotebookBlock) => void;
  onAddContrast?: (blockId: string) => void;
}

export const NodeModeView: React.FC<NodeModeViewProps> = ({
  blocks,
  activeNodeId,
  onNodeSelect,
  archetype,
  onAddBlock,
  onDeleteBlock, // Placeholder for future
  onEditBlock, // Placeholder for future
  onAddContrast,
}) => {
  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Empty State */}
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
          <p className="text-muted-foreground mb-4">No content yet.</p>
          <Button onClick={() => onAddBlock?.(0)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Block
          </Button>
        </div>
      )}

      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          {/* Node Item */}
          <div
            className={cn(
              "group relative flex gap-3 rounded-lg border p-4 transition-all duration-200",
              activeNodeId === block.id
                ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
                : "border-border bg-card hover:border-primary/50",
            )}
            onClick={() =>
              onNodeSelect(block.id === activeNodeId ? null : block.id)
            }
          >
            {/* Drag Handle (Visual Only for now) */}
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              {block.isHighYield && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 mb-2"
                >
                  ★ High Yield
                </Badge>
              )}

              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />

              {/* Metadata Tags */}
              {(block.tags?.length > 0 ||
                block.aiEvaluation?.confusionTags?.length! > 0) && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-dashed">
                  {block.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                  {block.aiEvaluation?.confusionTags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full flex items-center gap-1"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions (Hover) */}
            <div
              className={cn(
                "absolute right-2 top-2 flex flex-col gap-1 transition-opacity bg-card shadow-sm rounded-md border p-1",
                activeNodeId === block.id
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100",
              )}
            >
              {/* Red Button (Contrast Loop) */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Add Contrast / Trap (The 'Red Button')"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddContrast?.(block.id);
                }}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>

              {/* Placeholder Edit Actions */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Edit Block"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Insertion Zone */}
          <div className="group/insert relative h-4 flex items-center justify-center -my-2 z-10 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="w-full h-px bg-primary/20 group-hover/insert:bg-primary/50 transition-colors" />
            <Button
              size="icon"
              variant="secondary"
              className="absolute h-6 w-6 rounded-full shadow-sm border border-primary/20 bg-background text-primary hover:bg-primary hover:text-primary-foreground transform scale-0 group-hover/insert:scale-100 transition-all duration-200"
              onClick={() => onAddBlock?.(index + 1)}
              title="Insert Block Here"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
