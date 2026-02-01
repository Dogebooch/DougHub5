import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Activity, Brain, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

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
  return (
    <Card
      className={cn(
        "bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden relative group",
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
            <p className="text-2xl font-bold">87%</p>
            <p className="text-xs text-muted-foreground">Mastery Score</p>
          </div>

          <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full rotate-45" />
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Activity Chart */}
        <div className="h-[100px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #27272a",
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
