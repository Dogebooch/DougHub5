import React from "react";
import { BookOpen, Share2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViewToggleProps {
  value: "reader" | "node";
  onChange: (mode: "reader" | "node") => void;
}

/**
 * ViewToggle
 *
 * A premium-styled segmented control for switching between Reader Mode
 * (prose-focused) and Node Mode (graph/block focused).
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as "reader" | "node")}
      className="w-[180px]"
    >
      <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-muted/50 border border-border/50">
        <TabsTrigger
          value="reader"
          className="flex items-center gap-2 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Reader</span>
        </TabsTrigger>
        <TabsTrigger
          value="node"
          className="flex items-center gap-2 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Nodes</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
