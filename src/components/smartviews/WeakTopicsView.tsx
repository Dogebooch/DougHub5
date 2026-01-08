import { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  ChevronRight, 
  Play, 
  ArrowUpDown, 
  RefreshCcw,
  BookOpen,
  History
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { WeakTopicSummary } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

type SortOption = 'difficulty' | 'count' | 'name' | 'recent';

export function WeakTopicsView() {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [topics, setTopics] = useState<WeakTopicSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('difficulty');

  const fetchWeakTopics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.cards.getWeakTopicSummaries();
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setTopics(result.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch weak topics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeakTopics();
  }, []);

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => {
      switch (sortBy) {
        case 'difficulty': return b.avgDifficulty - a.avgDifficulty;
        case 'count': return b.cardCount - a.cardCount;
        case 'name': return a.topicName.localeCompare(b.topicName);
        case 'recent': 
          const dateA = a.lastReviewDate ? new Date(a.lastReviewDate).getTime() : 0;
          const dateB = b.lastReviewDate ? new Date(b.lastReviewDate).getTime() : 0;
          return dateB - dateA;
        default: return 0;
      }
    });
  }, [topics, sortBy]);

  const handleStartReview = () => {
    setCurrentView('review', null, { filter: 'weak' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Analyzing your performance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="bg-destructive/10 p-4 rounded-full">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={fetchWeakTopics} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="text-6xl">🎉</div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">No Weak Topics!</h2>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Great job! You''ve mastered your current curriculum. Keep up the consistent reviews to stay sharp.
          </p>
        </div>
        <Button onClick={() => setCurrentView('review')} className="mt-4">
          <Play className="h-4 w-4 mr-2" /> Continue Regular Study
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-end justify-between border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Weak Topics</h1>
          <p className="text-muted-foreground">
            {topics.length} topic{topics.length !== 1 ? "s" : ""} with
            high-difficulty cards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Sort by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("difficulty")}>
                Difficulty
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("count")}>
                Struggling Cards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("recent")}>
                Recently Seen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name")}>
                Alphabetical
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={handleStartReview}
            size="sm"
            className="bg-warning hover:bg-warning/90 text-white"
          >
            <Play className="h-4 w-4 mr-2" /> Review All Weak Cards
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedTopics.map((topic) => (
          <div
            key={topic.topicId}
            className="group relative overflow-hidden bg-card rounded-xl border border-border/20 elevation-1 hover:elevation-2 transition-all duration-300"
          >
            <div className="p-5 flex items-start gap-4">
              <div className="mt-1 bg-amber-500/10 p-2 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-lg leading-none group-hover:text-amber-600 transition-colors">
                      {topic.topicName}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {topic.cardCount} card{topic.cardCount !== 1 ? "s" : ""}{" "}
                        struggling
                      </span>
                      {topic.lastReviewDate && (
                        <span className="flex items-center gap-1">
                          <History className="h-3 w-3" />
                          Last:{" "}
                          {formatDistanceToNow(new Date(topic.lastReviewDate), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <DifficultyBadge difficulty={topic.avgDifficulty} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground/70">
                    <span>Topic Retention Health</span>
                    <span>{Math.round(100 - topic.avgDifficulty * 10)}%</span>
                  </div>
                  <Progress
                    value={100 - topic.avgDifficulty * 10}
                    className="h-1.5"
                    indicatorClassName={cn(
                      topic.avgDifficulty > 9 ? "bg-red-500" : "bg-amber-500"
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 hover:bg-amber-50/50 hover:text-amber-700"
                  onClick={() =>
                    setCurrentView("notebook", topic.notebookPageId, {
                      filter: "weak",
                    })
                  }
                >
                  View
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 hover:bg-amber-50/50 hover:text-amber-700 font-bold"
                  onClick={() =>
                    setCurrentView("review", null, {
                      filter: "weak",
                      topicId: topic.topicId,
                    })
                  }
                >
                  Study
                </Button>
              </div>
            </div>
            {/* Subtle accent bar */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300",
                topic.avgDifficulty > 9
                  ? "bg-red-500/20 group-hover:bg-red-500"
                  : "bg-amber-500/20 group-hover:bg-amber-500"
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const isCritical = difficulty >= 9;
  return (
    <Badge 
      variant={isCritical ? "destructive" : "secondary"}
      className={cn(
        "font-mono h-5 px-1.5 text-[10px]",
        !isCritical && "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"
      )}
    >
      DL {difficulty.toFixed(1)}
    </Badge>
  );
}
