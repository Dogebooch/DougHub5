import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sparkles, ArrowRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Mock Data
const recommendations = [
  {
    id: 1,
    title: "Pulmonary Embolism",
    type: "Weak Topic",
    reason: "Low accuracy (45%)",
  },
  {
    id: 2,
    title: "Antibiotic Stewardship",
    type: "Refresher",
    reason: "Not seen in 30 days",
  },
  {
    id: 3,
    title: "ECG Interpretation",
    type: "Active Recall",
    reason: "High-yield for boards",
  },
];

export function RecommendedLearningCard({
  className,
  onSelect,
}: {
  className?: string;
  onSelect: (topic: string) => void;
}) {
  return (
    <Card
      className={cn("bg-white/5 backdrop-blur-sm border-white/10", className)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Recommended
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {recommendations.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20 cursor-pointer transition-all duration-200"
            onClick={() => onSelect(item.title)}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground/90 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {item.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {item.reason}
                  </span>
                </div>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
