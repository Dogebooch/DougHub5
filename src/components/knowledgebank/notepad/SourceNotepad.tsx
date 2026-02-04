import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Type,
  List,
  Bold,
  Italic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceNotepadProps {
  itemId: string;
  initialNotes: string;
  onSave: (notes: string) => Promise<{ error?: string }>;
  className?: string;
}

export const SourceNotepad: React.FC<SourceNotepadProps> = ({
  itemId,
  initialNotes,
  onSave,
  className,
}) => {
  const [notes, setNotes] = useState(initialNotes || "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [lastSaved, setLastSaved] = useState(initialNotes || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state if prop changes (e.g. switching items)
  useEffect(() => {
    setNotes(initialNotes || "");
    setLastSaved(initialNotes || "");
    setStatus("idle");
  }, [itemId, initialNotes]);

  const handleSave = useCallback(async () => {
    if (notes === lastSaved) return;

    setStatus("saving");
    try {
      const result = await onSave(notes);
      if (result && result.error) {
        throw new Error(result.error);
      }
      setLastSaved(notes);
      setStatus("saved");

      // Reset saved status after delay
      setTimeout(() => {
        setStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2000);
    } catch (error) {
      console.error("Failed to save notes:", error);
      setStatus("error");
    }
  }, [notes, lastSaved, onSave]);

  // Keyboard shortcut: Ctrl+Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [handleSave]);

  // Debounced auto-save (3 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notes !== lastSaved && status !== "saving") {
        handleSave();
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [notes, lastSaved, handleSave, status]);

  // Editor toolbar actions (placeholder logic for now, can be expanded to rich text)
  const insertText = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}${prefix}${selection}${suffix}${after}`;
    setNotes(newText);

    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div
      className={cn("flex flex-col h-full bg-background border-l", className)}
    >
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/20">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-muted-foreground mr-2 px-2">
            NOTES
          </span>

          {/* Editor Tools */}
          <div className="flex items-center gap-0.5 border-l pl-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => insertText("**", "**")}
                  >
                    <Bold className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => insertText("_", "_")}
                  >
                    <Italic className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => insertText("- ")}
                  >
                    <List className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {status === "saving" && "Saving..."}
            {status === "saved" && "Saved"}
            {status === "error" && "Error saving"}
            {status === "idle" && notes !== lastSaved && "Unsaved changes"}
          </span>

          <Button
            size="sm"
            variant={notes !== lastSaved ? "default" : "ghost"}
            className={cn("h-7 px-2", status === "saved" && "text-green-600")}
            onClick={handleSave}
            disabled={status === "saving" || notes === lastSaved}
          >
            {status === "saving" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : status === "saved" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : status === "error" ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <Textarea
        ref={textareaRef}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type high-yield observations here... Ctrl+Enter to save."
        className="flex-1 resize-none rounded-none border-0 focus-visible:ring-0 p-4 font-mono text-sm leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
};
