import { useState } from 'react';
import { Trash2, X, PlusCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface BatchActionsProps {
  selectedCount: number;
  onAddToNotebook: () => void;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
}

export function BatchActions({
  selectedCount,
  onAddToNotebook,
  onDelete,
  onClearSelection,
}: BatchActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (selectedCount === 0) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-background border shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 min-w-[400px] justify-between border-primary/20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 border-r pr-6 border-border">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {selectedCount}
          </span>
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCount === 1 ? 'item selected' : 'items selected'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground rounded-full h-9"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>

          <Button
            size="sm"
            onClick={onAddToNotebook}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-9 px-4"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add to Notebook
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full h-9 px-4"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedCount} items?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. These items will be permanently
                  removed from your inbox.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

