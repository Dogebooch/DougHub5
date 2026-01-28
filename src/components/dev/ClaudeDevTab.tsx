import React, { useEffect, useRef, useState } from "react";
import { useClaudeDevStore } from "@/stores/useClaudeDevStore";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Camera,
  Send,
  Trash2,
  Crosshair,
  X,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  Bot,
  User,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ClaudeDevMessage } from "@/types/dev";
import { ModelSelector } from "./ModelSelector";
import { ConversationHistory } from "./ConversationHistory";
import { SessionStats } from "./SessionStats";

export function ClaudeDevTab() {
  const {
    status,
    isLoading,
    messages,
    isPickingElement,
    selectedElement,
    currentScreenshot,
    streamingMessageId,
    fetchStatus,
    sendMessageStreaming,
    captureScreenshot,
    clearMessages,
    startSession,
    setPickingElement,
    clearSelectedElement,
    setCurrentScreenshot,
  } = useClaudeDevStore();

  const currentView = useAppStore((s) => s.currentView);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    startSession();
  }, [fetchStatus, startSession]);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Also scroll when streaming content updates
  useEffect(() => {
    if (streamingMessageId && scrollRef.current) {
      // Debounce scroll during rapid updates
      const timeoutId = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [streamingMessageId, messages]);

  // Handle element picker
  useEffect(() => {
    if (!isPickingElement) return;

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;

      // Don't pick elements from the dev panel itself
      if (target.closest("[data-claude-dev-panel]")) {
        return;
      }

      const rect = target.getBoundingClientRect();

      // Build a CSS selector for the element
      let selector = target.tagName.toLowerCase();
      if (target.id) {
        selector += `#${target.id}`;
      } else if (target.className && typeof target.className === "string") {
        const classes = target.className.split(" ").filter(Boolean).slice(0, 3);
        if (classes.length > 0) {
          selector += `.${classes.join(".")}`;
        }
      }

      useClaudeDevStore.getState().setSelectedElement({
        selector,
        tagName: target.tagName.toLowerCase(),
        className: typeof target.className === "string" ? target.className : "",
        id: target.id || undefined,
        textContent: target.textContent?.slice(0, 500) || undefined,
        boundingRect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      });

      // Capture screenshot of the element region (with some padding)
      const padding = 20;
      captureScreenshot({
        x: Math.max(0, Math.round(rect.x - padding)),
        y: Math.max(0, Math.round(rect.y - padding)),
        width: Math.round(rect.width + padding * 2),
        height: Math.round(rect.height + padding * 2),
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPickingElement(false);
      }
    };

    // Add highlight style
    const style = document.createElement("style");
    style.id = "claude-dev-picker-style";
    style.textContent = `
      *:hover {
        outline: 2px solid hsl(var(--primary)) !important;
        outline-offset: 2px !important;
      }
      [data-claude-dev-panel] *:hover {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);

    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
      const existingStyle = document.getElementById("claude-dev-picker-style");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isPickingElement, captureScreenshot, setPickingElement]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || streamingMessageId) return;

    const message = input;
    setInput("");
    // Always use streaming for better UX
    await sendMessageStreaming(message, currentView);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCaptureFullScreen = async () => {
    await captureScreenshot();
  };

  if (!status?.hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Claude Code CLI Required</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {status?.error ||
            "Install Claude Code and run 'claude login' to authenticate."}
        </p>
        <Badge variant="outline" className="font-mono text-xs">
          npm install -g @anthropic-ai/claude-code
        </Badge>
      </div>
    );
  }

  const isDisabled = isLoading || streamingMessageId !== null;

  return (
    <div className="flex flex-col h-full" data-claude-dev-panel>
      {/* Conversation History */}
      <ConversationHistory />

      {/* Status bar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Badge
            variant={status.isConnected ? "default" : "destructive"}
            className="gap-1"
          >
            {status.isConnected ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            Connected
          </Badge>
          <ModelSelector />
          <span className="text-xs text-muted-foreground">
            View: {currentView}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          className="h-7"
          disabled={isDisabled}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Ask me about the UI, report bugs, or request changes.
              </p>
              <p className="text-xs mt-2">
                Use the camera button to capture a screenshot, or the crosshair
                to select a specific element.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={msg.id === streamingMessageId}
            />
          ))}
          {isLoading && !streamingMessageId && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Claude is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Session Stats */}
      <SessionStats />

      {/* Context indicators */}
      {(currentScreenshot || selectedElement) && (
        <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-2 flex-wrap">
          {currentScreenshot && (
            <Badge variant="secondary" className="gap-1">
              <ImageIcon className="w-3 h-3" />
              Screenshot attached
              <button
                onClick={() => setCurrentScreenshot(null)}
                className="ml-1 hover:text-destructive"
                disabled={isDisabled}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedElement && (
            <Badge variant="secondary" className="gap-1 font-mono text-[10px]">
              <Crosshair className="w-3 h-3" />
              {selectedElement.selector.slice(0, 30)}
              <button
                onClick={clearSelectedElement}
                className="ml-1 hover:text-destructive"
                disabled={isDisabled}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Element picker overlay indicator */}
      {isPickingElement && (
        <div className="px-3 py-2 border-t bg-primary/10 text-primary text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 animate-pulse" />
            Click any element to select it (Esc to cancel)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPickingElement(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t">
        <div className="flex gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCaptureFullScreen}
            disabled={isDisabled}
            title="Capture screenshot"
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Button
            variant={isPickingElement ? "default" : "outline"}
            size="sm"
            onClick={() => setPickingElement(!isPickingElement)}
            disabled={isDisabled}
            title="Select element"
          >
            <Crosshair className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              streamingMessageId
                ? "Waiting for response..."
                : "Describe the issue or ask a question..."
            }
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isDisabled}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isDisabled}
            className="self-end"
          >
            {isDisabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ClaudeDevMessage;
  isStreaming?: boolean;
}

/**
 * Parse message content to extract tool calls and format them nicely
 */
function parseMessageContent(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // Split by tool markers and result markers
  const toolRegex = /🔧 \*\*([^*]+)\*\*/g;
  const resultRegex = /↳ (.+)/g;

  let lastIndex = 0;
  const allMatches: { index: number; length: number; type: "tool" | "result"; name?: string; text?: string }[] = [];

  // Find all tool markers
  let match;
  while ((match = toolRegex.exec(content)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, type: "tool", name: match[1] });
  }

  // Find all result markers
  while ((match = resultRegex.exec(content)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, type: "result", text: match[1] });
  }

  // Sort by index
  allMatches.sort((a, b) => a.index - b.index);

  // Build parts
  for (const m of allMatches) {
    // Add text before this match
    if (m.index > lastIndex) {
      const text = content.slice(lastIndex, m.index).trim();
      if (text) {
        parts.push(<span key={`text-${lastIndex}`}>{text}</span>);
      }
    }

    // Add the formatted element
    if (m.type === "tool" && m.name) {
      parts.push(
        <div key={`tool-${m.index}`} className="flex items-center gap-1.5 py-1 text-primary">
          <Wrench className="w-3 h-3" />
          <span className="font-medium">{m.name}</span>
        </div>
      );
    } else if (m.type === "result" && m.text) {
      parts.push(
        <div key={`result-${m.index}`} className="flex items-start gap-1 pl-4 text-muted-foreground text-xs">
          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="truncate max-w-[300px]">{m.text}</span>
        </div>
      );
    }

    lastIndex = m.index + m.length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      parts.push(<span key={`text-${lastIndex}`}>{text}</span>);
    }
  }

  return parts.length > 0 ? parts : [<span key="content">{content}</span>];
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasToolCalls = !isUser && message.content.includes("🔧");

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          "flex flex-col max-w-[85%]",
          isUser ? "items-end" : "items-start",
        )}
      >
        {message.screenshot && (
          <img
            src={message.screenshot}
            alt="Screenshot"
            className="max-w-full rounded-md border mb-2 max-h-[200px] object-contain"
          />
        )}
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {hasToolCalls ? parseMessageContent(message.content) : message.content}
            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-0.5 bg-foreground animate-pulse" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {format(message.timestamp, "HH:mm:ss")}
          </span>
          {/* Show model and token info for assistant messages */}
          {!isUser && message.model && (
            <span className="text-[10px] text-muted-foreground capitalize">
              {message.model}
            </span>
          )}
          {!isUser && message.usage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground cursor-help flex items-center gap-0.5">
                  {(
                    message.usage.inputTokens + message.usage.outputTokens
                  ).toLocaleString()}{" "}
                  tokens
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="space-y-0.5">
                  <div>Input: {message.usage.inputTokens.toLocaleString()}</div>
                  <div>
                    Output: {message.usage.outputTokens.toLocaleString()}
                  </div>
                  {message.cost && (
                    <div className="font-medium pt-1 border-t">
                      Cost: ${message.cost.totalCost.toFixed(4)}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
