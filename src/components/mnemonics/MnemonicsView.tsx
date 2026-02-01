import { Image as ImageIcon } from "lucide-react";

export function MnemonicsView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="relative">
        <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-surface-elevated border border-border/50 p-6 rounded-2xl shadow-2xl elevation-3">
          <ImageIcon className="h-16 w-16 text-primary/40" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
          Picture Mnemonics
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Visual memory anchors are currently being calculated by the neural
          engine.
        </p>
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-bounce">
        <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
        Coming Soon
      </div>
    </div>
  );
}
