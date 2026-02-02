import React, { useState, ReactNode } from "react";
import { ConnectedContentPanel } from "./ConnectedContentPanel";
import { ViewToggle } from "../ViewToggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

interface NotebookArticleLayoutProps {
  children: ReactNode;
  viewMode: "reader" | "node";
  onViewModeChange: (mode: "reader" | "node") => void;
  activeNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  title: string;
  onAddFlashcard?: (blockId: string) => void;
  onViewSource?: (sourceId: string) => void;
}

export const NotebookArticleLayout: React.FC<NotebookArticleLayoutProps> = ({
  children,
  viewMode,
  onViewModeChange,
  activeNodeId,
  onNodeSelect,
  title,
  onAddFlashcard,
  onViewSource,
}) => {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Top Bar / Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0 h-14 bg-card/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold truncate max-w-[400px]">
            {title || "Untitled Topic"}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <ViewToggle value={viewMode} onChange={onViewModeChange} />

          <div className="mx-2 h-6 w-px bg-border" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            title="Toggle Context Panel"
          >
            {isRightPanelOpen ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Article/Node Canvas */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full w-full overflow-y-auto">
            <div
              className={cn(
                "mx-auto min-h-full transition-all duration-300",
                viewMode === "reader"
                  ? "max-w-4xl py-12 px-8"
                  : "max-w-5xl py-8 px-6",
              )}
              onClick={(e) => {
                // Deselect node if clicking background area (and not a child)
                if (e.target === e.currentTarget) {
                  onNodeSelect(null);
                }
              }}
            >
              {children}
            </div>
          </div>
        </div>

        {/* Right Panel (Collapsible) */}
        <div
          className={cn(
            "border-l border-border bg-background transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
            isRightPanelOpen ? "w-[350px] opacity-100" : "w-0 opacity-0",
          )}
        >
          <ConnectedContentPanel
            activeNodeId={activeNodeId}
            onClose={() => setIsRightPanelOpen(false)}
            onAddFlashcard={onAddFlashcard}
            onViewSource={onViewSource}
          />
        </div>
      </div>
    </div>
  );
};
