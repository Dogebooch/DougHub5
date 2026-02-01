import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Play, Layers } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

export function DailyReviewCard({ className }: { className?: string }) {
  const getCardsDueToday = useAppStore((state) => state.getCardsDueToday);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const dueCount = isHydrated ? getCardsDueToday().length : 0;

  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-primary/20 via-background to-background border-primary/20 overflow-hidden relative group cursor-pointer hover:shadow-lg transition-all duration-300",
        className,
      )}
      onClick={() => setCurrentView("review")}
    >
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Layers className="h-24 w-24 -rotate-12" />
      </div>

      <CardContent className="h-full flex flex-col justify-between p-6">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-primary font-medium tracking-wide uppercase text-xs">
            Daily Review
          </div>
          <h3 className="text-3xl font-bold tracking-tight">
            {dueCount} Cards Due
          </h3>
          <p className="text-muted-foreground text-sm">
            {dueCount > 0
              ? "Your brain is ready to learn. Let's optimize those pathways."
              : "All caught up for now. Great work!"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold text-primary mt-4 group-hover:translate-x-1 transition-transform">
          Start Session <Play className="h-4 w-4 fill-current" />
        </div>
      </CardContent>
    </Card>
  );
}
