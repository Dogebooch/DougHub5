import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Brain } from "lucide-react";

export function StopAndRecallModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-primary/20">
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Stop & Recall</h2>
          <p className="text-muted-foreground">
            Before continuing, say out loud the 3 most important points from the
            last section.
          </p>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3 animate-pulse" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
