import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/stores/useAppStore";
import { PlayCircle, BarChart3, BookOpen } from "lucide-react";

export function LearningDashboard() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Learning Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Build your medical intuition.
          </p>
        </div>
        <div className="flex gap-2">{/* Quick Actions */}</div>
      </div>

      {/* Main Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10 cursor-pointer hover:border-teal-400 transition-all group"
          onClick={() => setCurrentView("review")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-teal-700 dark:text-teal-400 flex items-center gap-2">
              <PlayCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
              Review Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              --
            </div>
            <p className="text-xs text-teal-600/80 font-medium">
              Cards Due Today
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-slate-400 transition-all group"
          onClick={() => setCurrentView("notebook")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BookOpen className="h-5 w-5 group-hover:scale-110 transition-transform" />
              Notebook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              Library
            </div>
            <p className="text-xs text-slate-500 font-medium">Manage Topics</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-slate-400 transition-all group"
          onClick={() => setCurrentView("stats")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 group-hover:scale-110 transition-transform" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              FSRS
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Algorithm Active
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
