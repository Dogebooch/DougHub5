import { useEffect, useState } from "react";
import { useClaudeDevStore } from "@/stores/useClaudeDevStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { History, ChevronDown, Plus, Trash2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ConversationHistoryProps {
  onNewConversation?: () => void;
}

export function ConversationHistory({ onNewConversation }: ConversationHistoryProps) {
  const {
    conversations,
    currentConversationId,
    fetchHistory,
    loadConversation,
    deleteConversation,
    startSession,
    isLoading,
    streamingMessageId,
  } = useClaudeDevStore();

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  const handleSelectConversation = async (id: string) => {
    await loadConversation(id);
    setIsOpen(false);
  };

  const handleNewConversation = async () => {
    await startSession();
    onNewConversation?.();
    setIsOpen(false);
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: string
  ) => {
    e.stopPropagation();
    await deleteConversation(id);
    // Refresh the list
    await fetchHistory();
  };

  const isDisabled = isLoading || streamingMessageId !== null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border-b">
        <CollapsibleTrigger asChild>
          <button
            className="w-full p-2 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
            disabled={isDisabled}
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
              {conversations.length > 0 && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              )}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t">
            {/* New conversation button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              disabled={isDisabled}
              className="w-full justify-start gap-2 h-9 rounded-none border-b text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </Button>

            {/* Conversation list */}
            <ScrollArea className="max-h-48">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No conversation history yet
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full p-2 text-left hover:bg-muted/50 border-l-2 transition-colors group",
                      conv.id === currentConversationId
                        ? "border-primary bg-muted/30"
                        : "border-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">
                          {conv.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>
                            {format(conv.updatedAt, "MMM d, HH:mm")}
                          </span>
                          <span>·</span>
                          <span>{conv.metadata.messageCount} msgs</span>
                          <span>·</span>
                          <span className="capitalize">
                            {conv.metadata.model}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDelete(e, conv.id)}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
