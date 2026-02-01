import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link2 } from "lucide-react";

export function ConceptConnectorModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-indigo-500/20">
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Link2 className="h-6 w-6 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold">Concept Connector</h2>
          <p className="text-muted-foreground">
            How does{" "}
            <span className="text-foreground font-semibold">Sarcoidosis</span>{" "}
            relate to{" "}
            <span className="text-foreground font-semibold">Tuberculosis</span>?
          </p>
          <div className="w-full p-4 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
            Type your explanation here...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
