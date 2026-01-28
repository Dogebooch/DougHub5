import React, { useEffect, useRef, useState } from "react";
import { useClaudeDevStore } from "@/stores/useClaudeDevStore";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { ClaudeDevMessage } from "@/types/dev";

export function ClaudeDevTab() {
  const {
    status,
    isLoading,
    messages,
    isPickingElement,
    selectedElement,
    currentScreenshot,
    fetchStatus,
    sendMessage,
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    if (!input.trim() || isLoading) return;
    
    const message = input;
    setInput("");
    await sendMessage(message, currentView);
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
          {status?.error || "Install Claude Code and run 'claude login' to authenticate."}
        </p>
        <Badge variant="outline" className="font-mono text-xs">
          npm install -g @anthropic-ai/claude-code
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-claude-dev-panel>
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
            {status.model}
          </Badge>
          <span className="text-xs text-muted-foreground">
            View: {currentView}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearMessages}
          className="h-7"
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
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Claude is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

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
            disabled={isLoading}
            title="Capture screenshot"
          >
            <Camera className="w-4 h-4" />
          </Button>
          <Button
            variant={isPickingElement ? "default" : "outline"}
            size="sm"
            onClick={() => setPickingElement(!isPickingElement)}
            disabled={isLoading}
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
            placeholder="Describe the issue or ask a question..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end"
          >
            {isLoading ? (
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

function MessageBubble({ message }: { message: ClaudeDevMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          "flex flex-col max-w-[85%]",
          isUser ? "items-end" : "items-start"
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
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground mt-1">
          {format(message.timestamp, "HH:mm:ss")}
        </span>
      </div>
    </div>
  );
}
