import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GraduationCap, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClassroomCard({
  className,
  onStartSession,
}: {
  className?: string;
  onStartSession: () => void;
}) {
  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-indigo-900/20 to-background border-indigo-500/20 relative overflow-hidden",
        className,
      )}
    >
      {/* Background Decoration */}
      <div className="absolute -right-10 -bottom-10 opacity-5">
        <GraduationCap className="h-64 w-64 rotate-12" />
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-400 uppercase tracking-widest text-sm">
          <GraduationCap className="h-4 w-4" />
          AI Classroom
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 relative z-10">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-foreground/90">
            Ready for a session?
          </h3>
          <p className="text-muted-foreground text-sm max-w-[80%]">
            Pick a topic or let the AI guide you through your weak areas with
            active coaching.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full justify-between group bg-indigo-600 hover:bg-indigo-700 text-white border-none"
            onClick={onStartSession}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Ask a Question
            </span>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>

          <Button
            variant="outline"
            className="w-full justify-between group border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300"
            onClick={onStartSession}
          >
            <span>Pick Article to Focus On</span>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
