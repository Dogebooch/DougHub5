import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity, Brain, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { GlobalCardStats } from "@/types";
import { useAppStore } from "@/stores/useAppStore";

const mockData = [
  { name: "Mon", score: 40 },
  { name: "Tue", score: 30 },
  { name: "Wed", score: 60 },
  { name: "Thu", score: 45 },
  { name: "Fri", score: 80 },
  { name: "Sat", score: 55 },
  { name: "Sun", score: 70 },
];

export function InsightsCard({ className }: { className?: string }) {
  const [stats, setStats] = useState<GlobalCardStats | null>(null);
  const isHydrated = useAppStore((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated && window.api?.cards?.getGlobalStats) {
      window.api.cards.getGlobalStats().then((result) => {
        if (result.success) {
          setStats(result.data);
        }
      });
    }
  }, [isHydrated]);

  // Calculate mastery (Mature / Total)
  const totalCards = stats ? stats.total : 0;
  const matureCards = stats ? stats.byState.mature : 0;
  const masteryPercentage =
    totalCards > 0 ? Math.round((matureCards / totalCards) * 100) : 0;

  return (
    <Card
      className={cn(
        "bg-background/40 backdrop-blur-sm border-border/50 overflow-hidden relative group",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Insights
        </CardTitle>
        <Brain className="h-4 w-4 text-muted-foreground/50" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Mastery Circle Placeholder */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-2xl font-bold">{masteryPercentage}%</p>
            <p className="text-xs text-muted-foreground">Mastery Score</p>
            {stats && (
              <p className="text-[10px] text-muted-foreground/60">
                {matureCards} / {totalCards} cards mature
              </p>
            )}
          </div>

          <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
            <div
              className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full rotate-45 transition-all duration-1000"
              style={{
                strokeDasharray: `${masteryPercentage}, 100`, // Simple visual proxy
              }}
            />
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Activity Chart */}
        <div className="h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData}>
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--popover-foreground))",
                  borderRadius: "6px",
                }}
                cursor={{ fill: "transparent" }}
              />
              <Bar
                dataKey="score"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                className="fill-primary/50 hover:fill-primary transition-colors duration-300"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
