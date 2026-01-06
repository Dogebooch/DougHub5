import { useState, useEffect, useRef, useCallback } from "react";
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
import { X, Upload, ImageIcon, Keyboard } from "lucide-react";
import type { SourceItem } from "@/types";
import { useAppStore } from "@/stores/useAppStore";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface QuickDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickDumpModal({ isOpen, onClose }: QuickDumpModalProps) {
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"text" | "image">("text");
  const [imageData, setImageData] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshCounts = useAppStore((state) => state.refreshCounts);

  const handleImageFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image too large. Please use an image smaller than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImageData(result);
      setContentType("image");
      setContent(""); // Clear text as modes are mutually exclusive
      toast.info("Switched to image mode");
    };
    reader.onerror = () => {
      toast.error("Failed to read image file");
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            // Prevent default to avoid pasting binary text or the image filename
            e.preventDefault();
          }
          return;
        }
      }
    },
    [handleImageFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleImageFile(file);
      }
    },
    [handleImageFile]
  );

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    // Reset value so the same file can be picked again if cleared
    e.target.value = "";
  };

  const clearImage = () => {
    setImageData(null);
    setContentType("text");
  };

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
    if (contentType === "text" && !trimmedContent) {
      return;
    }
    if (contentType === "image" && !imageData) {
      return;
    }

    setIsSaving(true);
    try {
      if (typeof window !== "undefined" && window.api) {
        let mediaPath: string | undefined = undefined;

        // If it's an image, save it to disk first
        if (contentType === "image" && imageData) {
          const mimeType =
            imageData.match(/^data:([^;]+);/)?.[1] || "image/png";
          const saveResult = await window.api.files.saveImage(
            imageData,
            mimeType
          );

          if (saveResult.error) {
            toast.error(`Failed to save image file: ${saveResult.error}`);
            setIsSaving(false);
            return;
          }

          if (saveResult.data) {
            mediaPath = saveResult.data.path;
          }
        }

        // Generate title from first 50 characters or use placeholder for image
        const title =
          contentType === "image"
            ? "Image Capture"
            : trimmedContent.length > 50
            ? trimmedContent.slice(0, 50) + "..."
            : trimmedContent;

        const sourceItem: SourceItem = {
          id: crypto.randomUUID(),
          sourceType: contentType === "image" ? "image" : "quickcapture",
          sourceName: "Quick Dump",
          title,
          rawContent: trimmedContent || "Image capture",
          mediaPath,
          canonicalTopicIds: [],
          tags: [],
          status: "inbox",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await window.api.sourceItems.create(sourceItem);
        if (result.error) {
          toast.error(`Failed to save: ${result.error}`);
          return;
        }

        // Refresh counts in store
        await refreshCounts();
      }

      toast("Saved to inbox", {
        description: "Process when you're rested",
        duration: 2000,
      });
      setContent("");
      setImageData(null);
      setContentType("text");
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
    setImageData(null);
    setContentType("text");
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (contentType === "text") {
          textareaRef.current?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsDragging(false);
    }
  }, [isOpen, contentType]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        className="sm:max-w-[600px] overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex flex-col items-center justify-center backdrop-blur-[2px] pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-background/80 p-6 rounded-full shadow-xl flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-primary animate-bounce" />
              <p className="text-lg font-semibold text-primary">
                Drop image here
              </p>
            </div>
          </div>
        )}

        <DialogHeader>
          <DialogTitle>Quick Dump</DialogTitle>
        </DialogHeader>

        <div className="py-4 min-h-[240px] flex flex-col">
          {contentType === "image" && imageData ? (
            <div className="relative group border rounded-md overflow-hidden bg-muted flex items-center justify-center flex-1 animate-in fade-in duration-300">
              <img
                src={imageData}
                alt="Preview"
                className="max-h-[300px] w-full object-contain"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8 shadow-md"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2 animate-in fade-in duration-300">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="Paste text or image..."
                className="flex-1 min-h-[200px] resize-none border-2 border-border/80 focus:border-primary/50 transition-colors"
              />
              <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground/50 select-none">
                <Keyboard className="h-3 w-3" />
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted/50 text-[9px] font-mono">
                    Ctrl
                  </kbd>{" "}
                  +{" "}
                  <kbd className="px-1 py-0.5 rounded bg-muted/50 text-[9px] font-mono">
                    Enter
                  </kbd>{" "}
                  to save
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBrowseClick}
              disabled={isSaving || contentType === "image"}
              className="h-8 px-3 text-muted-foreground hover:text-primary transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
              Browse image
            </Button>
          </div>
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
            disabled={
              isSaving ||
              (contentType === "text" ? !content.trim() : !imageData)
            }
            className="shadow-sm"
          >
            Save for Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
