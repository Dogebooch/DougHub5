import { useState, useEffect } from "react";
import { Brain, Mic, CheckCircle2, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Since framer-motion is not available, we will use standard div with CSS transitions
// If we really need animations we can use `animate-in` classes from tailwind-animate

interface ActiveRecallScreenProps {
  topic: string;
  onClose: () => void;
}

export function ActiveRecallScreen({
  topic,
  onClose,
}: ActiveRecallScreenProps) {
  const [step, setStep] = useState<"prompt" | "recording" | "feedback">(
    "prompt",
  );
  const [timer, setTimer] = useState(0);

  // Mock timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "recording") {
      interval = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 right-6"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      <div className="max-w-2xl w-full space-y-12 text-center">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Chewing the Fat</h2>
          <p className="text-muted-foreground text-lg">
            Let's verify your understanding of{" "}
            <span className="text-foreground font-semibold">{topic}</span>.
          </p>
        </div>

        {/* Content Area */}
        <div className="bg-card border rounded-2xl p-8 shadow-xl min-h-[300px] flex flex-col items-center justify-center space-y-6">
          {step === "prompt" && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <h3 className="text-2xl font-medium">
                "Explain the mechanism of action for this topic as if you were
                teaching a med student."
              </h3>
              <Button
                size="lg"
                onClick={() => setStep("recording")}
                className="gap-2 text-lg px-8 h-12"
              >
                <Mic className="h-5 w-5" /> Start Speaking
              </Button>
            </div>
          )}

          {step === "recording" && (
            <div className="space-y-6 animate-in zoom-in-95 fade-in duration-300">
              <div className="flex items-center gap-2 text-red-500 font-mono font-bold text-xl">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Recording...{" "}
                {new Date(timer * 1000).toISOString().substr(14, 5)}
              </div>
              <div className="h-12 w-64 bg-muted rounded-full overflow-hidden flex items-center justify-center gap-1">
                {/* Pseudowaveform */}
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-foreground/50 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 100}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setStep("feedback")}
                className="gap-2"
              >
                <div className="h-3 w-3 bg-foreground rounded-sm" /> Stop &
                Analyze
              </Button>
            </div>
          )}

          {step === "feedback" && (
            <div className="space-y-6 text-left w-full h-full animate-in fade-in duration-500">
              <div className="flex items-center gap-2 text-green-500 font-bold uppercase tracking-widest text-sm mb-4">
                <CheckCircle2 className="h-4 w-4" /> Analysis Complete
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <h4 className="font-semibold mb-2">Key Concepts Covered:</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Pathophysiology",
                      "Clinical Presentation",
                      "Treatment",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="bg-background/50 px-2 py-1 rounded text-xs border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-semibold mb-2 text-muted-foreground">
                    What you missed:
                  </h4>
                  <p className="text-sm">
                    You didn't mention the <strong>black box warning</strong>{" "}
                    associated with long-term use.
                  </p>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button size="lg" onClick={onClose} className="gap-2">
                  Continue Session <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Fixed imports to remove motion since we don't have it
