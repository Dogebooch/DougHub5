import { useState } from "react";
import { InsightsCard } from "./InsightsCard";
import { DailyReviewCard } from "./DailyReviewCard";
import { RecommendedLearningCard } from "./RecommendedLearningCard";
import { ClassroomCard } from "./ClassroomCard";
import { ActiveRecallScreen } from "./ActiveRecallScreen";
import { ClassroomChatInterface } from "./ClassroomChatInterface";
import { StopAndRecallModal } from "./StopAndRecallModal";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
// Placeholder for the actual article view - we would import TopicArticleView normally
// import { TopicArticleView } from "../notebook/article";

// Mock Article View Placeholder
function MockArticleView() {
  return (
    <div className="h-full flex items-center justify-center bg-muted/10 text-muted-foreground border-r border-border/40">
      [ Article View Component Would Render Here ]
    </div>
  );
}

export function LearningDashboard() {
  const [viewMode, setViewMode] = useState<"dashboard" | "classroom">(
    "dashboard",
  );
  const [activeRecallOpen, setActiveRecallOpen] = useState(false);
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const startClassroomSession = (topic?: string) => {
    setActiveTopic(topic || "General Session");
    setViewMode("classroom");
  };

  const handleBackToDashboard = () => {
    setViewMode("dashboard");
    setActiveTopic(null);
  };

  // Mock checking valid topic for active recall
  const handleRecallTrigger = () => {
    setActiveRecallOpen(true);
  };

  return (
    <div className="h-full w-full bg-slate-950 text-slate-100 overflow-hidden relative font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full flex flex-col">
        {viewMode === "dashboard" ? (
          <div className="p-8 h-full flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Learning Center
              </h1>
              <p className="text-slate-400">
                Master your medical knowledge with active recall and spaced
                repetition.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-0">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                <InsightsCard className="flex-1 min-h-[250px]" />
                <RecommendedLearningCard
                  className="flex-1 min-h-[250px]"
                  onSelect={(topic) => startClassroomSession(topic)}
                />
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6">
                <DailyReviewCard className="h-[200px]" />
                <ClassroomCard
                  className="flex-1"
                  onStartSession={() => startClassroomSession()}
                />
              </div>
            </div>
          </div>
        ) : (
          // Classroom Mode (Split Screen)
          <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Classroom Header */}
            <div className="h-14 border-b border-border/40 flex items-center px-4 gap-4 bg-background/50 backdrop-blur-sm shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToDashboard}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Dashboard
              </Button>
              <div className="h-4 w-px bg-border/40" />
              <span className="font-medium text-sm">{activeTopic}</span>
              <div className="ml-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRecallTrigger}
                  className="text-xs"
                >
                  Force Recall
                </Button>
              </div>
            </div>

            {/* Split Pane */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 min-w-0">
                <MockArticleView />
              </div>
              <div className="w-[400px] border-l border-border/40 shrink-0 bg-background/30 backdrop-blur-sm">
                <ClassroomChatInterface />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      {activeRecallOpen && activeTopic && (
        <ActiveRecallScreen
          topic={activeTopic}
          onClose={() => setActiveRecallOpen(false)}
        />
      )}

      <StopAndRecallModal
        open={recallModalOpen}
        onOpenChange={setRecallModalOpen}
      />
    </div>
  );
}
