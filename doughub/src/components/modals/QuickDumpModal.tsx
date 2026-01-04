import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuickDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickDumpModal({ isOpen, onClose }: QuickDumpModalProps) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setContent("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleCancel();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleSave = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    setIsSaving(true);
    try {
      // Create a Note from the quick dump
      if (typeof window !== "undefined" && window.api) {
        const now = new Date();
        const timestamp = now.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        const note = {
          id: crypto.randomUUID(),
          title: `Quick Dump - ${timestamp}`,
          content: trimmedContent,
          cardIds: [],
          tags: ["quick-dump"],
          createdAt: now.toISOString(),
        };

        const result = await window.api.notes.create(note);
        if (result.error) {
          toast.error(`Failed to save: ${result.error}`);
          return;
        }
      }

      toast.success("Saved to queue");
      setContent("");
      onClose();
    } catch (error) {
      toast.error("Failed to save quick dump");
      console.error("[QuickDump] Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Quick Dump</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste anything here..."
            className="min-h-[200px] resize-none"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
          >
            Save for Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
