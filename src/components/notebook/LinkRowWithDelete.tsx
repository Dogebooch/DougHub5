import React, { useState } from "react";
import { NotebookLink } from "@/types";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowRight, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface LinkRowWithDeleteProps {
  link: NotebookLink;
  targetTopicName: string;
  targetBlockExcerpt: string;
  onDelete: (linkId: string) => void;
  onNavigate: (blockId: string) => void;
  onHover: (
    anchorText?: string,
    anchorStart?: number,
    anchorEnd?: number,
  ) => void;
  onHoverEnd: () => void;
}

export function LinkRowWithDelete({
  link,
  targetTopicName,
  targetBlockExcerpt,
  onDelete,
  onNavigate,
  onHover,
  onHoverEnd,
}: LinkRowWithDeleteProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent accidental navigation
    setIsDeleting(true);
    try {
      const res = await window.api.notebookLinks.delete(link.id);

      if (res.data) {
        onDelete(link.id);
        toast({ description: "Link removed" });
        setShowConfirm(false);
      } else if (res.error) {
        toast({
          title: "Error",
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />

      <div
        className="flex-1 min-w-0"
        onClick={() => onNavigate(link.targetBlockId)}
        onMouseEnter={() =>
          onHover(link.anchorText, link.anchorStart, link.anchorEnd)
        }
        onMouseLeave={onHoverEnd}
      >
        <span className="text-sm font-medium truncate block">
          {targetTopicName}
        </span>
        {link.anchorText && (
          <p className="text-xs text-muted-foreground truncate italic">
            "{link.anchorText}"
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 
          transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          setShowConfirm(true);
        }}
      >
        <X className="h-3 w-3" />
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove link to {targetTopicName}: "{targetBlockExcerpt.substring(
                0,
                50,
              )}
              ..."?
              {link.anchorText && (
                <span className="block mt-2 text-muted-foreground text-xs italic">
                  Anchor: "{link.anchorText}"
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
