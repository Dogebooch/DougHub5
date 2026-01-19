import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Loader2, 
  Link as LinkIcon 
} from "lucide-react";
import { NotebookLink, NotebookBlock } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LinkRowWithDelete } from "./LinkRowWithDelete";
import { IncomingLinkRow } from "./IncomingLinkRow";
import { AddManualLinkModal } from "./AddManualLinkModal";

interface LinkDetails {
  topicName: string;
  excerpt: string;
  pageId: string;
}

interface BlockLinksSidebarProps {
  block: NotebookBlock;
  topicName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (blockId: string, pageId: string) => void;
  contentRef: React.RefObject<HTMLDivElement>;
}

export const BlockLinksSidebar: React.FC<BlockLinksSidebarProps> = ({
  block,
  topicName,
  isOpen,
  onOpenChange,
  onNavigate,
  contentRef,
}) => {
  const [outgoingLinks, setOutgoingLinks] = useState<NotebookLink[]>([]);
  const [incomingLinks, setIncomingLinks] = useState<NotebookLink[]>([]);
  const [linkDetails, setLinkDetails] = useState<Map<string, LinkDetails>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [highlightCleanup, setHighlightCleanup] = useState<(() => void) | null>(null);

  const blockId = block.id;
  const totalLinks = outgoingLinks.length + incomingLinks.length;

  const fetchLinks = useCallback(async () => {
    if (!blockId) return;
    setIsLoading(true);
    try {
      const [outgoingRes, incomingRes] = await Promise.all([
        window.api.notebookLinks.getBySourceBlock(blockId),
        window.api.notebookLinks.getByTargetBlock(blockId),
      ]);

      const outgoing = outgoingRes.data || [];
      const incoming = incomingRes.data || [];

      setOutgoingLinks(outgoing);
      setIncomingLinks(incoming);

      // Fetch block details for each link (caching them)
      const newDetails = new Map(linkDetails);
      const blocksToFetch = new Set<string>();

      outgoing.forEach(link => {
        if (!newDetails.has(link.targetBlockId)) blocksToFetch.add(link.targetBlockId);
      });
      incoming.forEach(link => {
        if (!newDetails.has(link.sourceBlockId)) blocksToFetch.add(link.sourceBlockId);
      });

      if (blocksToFetch.size > 0) {
        // Fetch details for each block
        for (const tid of blocksToFetch) {
          const detailRes = await window.api.notebookBlocks.getById(tid);
          if (detailRes.data) {
            const fetchedBlock = detailRes.data;
            const pageRes = await window.api.notebookPages.getById(fetchedBlock.notebookTopicPageId);
            if (pageRes.data) {
              const page = pageRes.data;
              const topicRes = await window.api.canonicalTopics.getById(page.canonicalTopicId);
              newDetails.set(tid, {
                topicName: topicRes.data?.canonicalName || "Unknown Topic",
                excerpt: fetchedBlock.content.slice(0, 100) + (fetchedBlock.content.length > 100 ? "..." : ""),
                pageId: fetchedBlock.notebookTopicPageId
              });
            }
          }
        }
        setLinkDetails(newDetails);
      }
    } catch (err) {
      console.error("Error fetching links:", err);
    } finally {
      setIsLoading(false);
    }
  }, [blockId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleDeleteLink = (linkId: string) => {
    setOutgoingLinks(prev => prev.filter(l => l.id !== linkId));
  };

  const handleHoverLink = (anchorText?: string, anchorStart?: number, anchorEnd?: number) => {
    if (highlightCleanup) {
      highlightCleanup();
      setHighlightCleanup(null);
    }
    
    if (!contentRef.current || !anchorText) return;
    
    const contentEl = contentRef.current;
    const textContent = contentEl.textContent || "";
    
    let startPos = anchorStart;
    let endPos = anchorEnd;
    
    if (startPos === undefined || endPos === undefined) {
      const idx = textContent.indexOf(anchorText);
      if (idx === -1) return;
      startPos = idx;
      endPos = idx + anchorText.length;
    }
    
    const range = document.createRange();
    // Assuming the text is in the first child node (per NotebookBlock structure)
    // If there were complex formatting, we'd need a recursive text node finder
    const textNode = contentEl.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    
    try {
      range.setStart(textNode, startPos);
      range.setEnd(textNode, endPos);
      
      const highlight = document.createElement('span');
      highlight.className = 'bg-yellow-200 dark:bg-yellow-800/50 rounded px-0.5 transition-colors';
      range.surroundContents(highlight);
      
      setHighlightCleanup(() => () => {
        const parent = highlight.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(anchorText), highlight);
          parent.normalize();
        }
      });
    } catch (e) {
      console.warn("Could not highlight anchor text:", e);
    }
  };

  const handleHoverEnd = () => {
    if (highlightCleanup) {
      highlightCleanup();
      setHighlightCleanup(null);
    }
  };

  useEffect(() => {
    return () => {
      if (highlightCleanup) highlightCleanup();
    };
  }, [highlightCleanup]);

  return (
    <div className={cn(
      "absolute right-0 top-0 h-full transition-all duration-200 z-10",
      isOpen ? "w-64" : "w-10"
    )}>
      {!isOpen && (
        <button 
          onClick={() => onOpenChange(true)}
          className="h-full w-full flex flex-col items-center pt-4 gap-1 
            border-l bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <Badge 
            variant={totalLinks > 0 ? "default" : "secondary"}
            className="px-1.5 py-0 min-w-5 h-5 flex items-center justify-center"
          >
            {totalLinks}
          </Badge>
          <span className="text-[10px] font-medium text-muted-foreground uppercase vertical-text mt-2">
            Links
          </span>
          <ChevronLeft className="h-3 w-3 mt-auto mb-4" />
        </button>
      )}
      
      {isOpen && (
        <div className="h-full border-l bg-background flex flex-col shadow-xl animate-in slide-in-from-right duration-200">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Links</span>
              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                References
                <Badge variant="outline" className="text-[10px] px-1 py-0">{outgoingLinks.length}</Badge>
              </h4>
              <div className="space-y-1">
                {outgoingLinks.length > 0 ? (
                  outgoingLinks.map(link => {
                    const details = linkDetails.get(link.targetBlockId);
                    return (
                      <LinkRowWithDelete
                        key={link.id}
                        link={link}
                        targetTopicName={details?.topicName || "Loading..."}
                        targetBlockExcerpt={details?.excerpt || ""}
                        onDelete={handleDeleteLink}
                        onNavigate={(blockId) => {
                          if (details?.pageId) onNavigate(blockId, details.pageId);
                        }}
                        onHover={handleHoverLink}
                        onHoverEnd={handleHoverEnd}
                      />
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2 px-2">No references yet</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="p-3 space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                Linked From
                <Badge variant="outline" className="text-[10px] px-1 py-0">{incomingLinks.length}</Badge>
              </h4>
              <div className="space-y-1">
                {incomingLinks.length > 0 ? (
                  incomingLinks.map(link => {
                    const details = linkDetails.get(link.sourceBlockId);
                    return (
                      <IncomingLinkRow
                        key={link.id}
                        link={link}
                        sourceTopicName={details?.topicName || "Loading..."}
                        onNavigate={(blockId) => {
                          if (details?.pageId) onNavigate(blockId, details.pageId);
                        }}
                      />
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground italic py-2 px-2">No incoming links</p>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-muted/20">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2 text-xs font-medium"
              onClick={() => setShowAddLinkModal(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Connection
            </Button>
          </div>
        </div>
      )}

      {showAddLinkModal && (
        <AddManualLinkModal
          open={showAddLinkModal}
          onOpenChange={(open) => setShowAddLinkModal(open)}
          sourceBlock={block}
          sourceTopicName={topicName}
          onSuccess={fetchLinks}
        />
      )}
    </div>
  );
};
