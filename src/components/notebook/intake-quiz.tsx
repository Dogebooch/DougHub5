import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IntakeQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntakeQuizModal({ open, onOpenChange }: IntakeQuizModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Intake Quiz</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center text-muted-foreground">
          Coming soon...
        </div>
      </DialogContent>
    </Dialog>
  );
}
