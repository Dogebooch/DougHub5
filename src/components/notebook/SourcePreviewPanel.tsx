import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceItem, SourceType } from "@/types";

interface SourcePreviewPanelProps {
  sourceItem: SourceItem;
}

export function SourcePreviewPanel({ sourceItem }: SourcePreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Determine if this is a QBank item and if it was answered correctly
  // QBank titles often contain "(Correct)" or "(Incorrect)" from capture
  const isQBank = sourceItem.sourceType === "qbank";
  const isCorrect = sourceItem.title.toLowerCase().includes("(correct)");
  const isIncorrect = sourceItem.title.toLowerCase().includes("(incorrect)");

  // Get display-friendly source type label
  const sourceTypeLabels: Record<SourceType, string> = {
    qbank: "QBank",
    article: "Article",
    pdf: "PDF",
    image: "Image",
    audio: "Audio",
    quickcapture: "Quick Capture",
    manual: "Manual Entry",
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto"
          >
            <div className="flex items-center gap-2 text-left min-w-0 flex-1">
              <Badge variant="secondary" className="text-xs shrink-0">
                {sourceTypeLabels[sourceItem.sourceType]}
              </Badge>
              <span className="font-medium truncate">
                {sourceItem.title}
              </span>
              {isQBank && isCorrect && (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              )}
              {isQBank && isIncorrect && (
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground ml-2 shrink-0">
              <span className="text-xs">{isOpen ? "Collapse" : "Expand"}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">
            {/* Source name and URL */}
            <div className="text-xs text-muted-foreground mb-2">
              {sourceItem.sourceName}
              {sourceItem.sourceUrl && (
                <span className="ml-1">• {sourceItem.sourceUrl}</span>
              )}
            </div>
            
            {/* Raw content preview */}
            <div className="text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {sourceItem.rawContent || "No content available."}
            </div>
            
            {/* Metadata if available */}
            {sourceItem.metadata?.summary && (
              <div className="mt-2 text-xs text-muted-foreground italic">
                Summary: {sourceItem.metadata.summary}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
