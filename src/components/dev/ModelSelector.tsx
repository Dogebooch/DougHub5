import { useEffect } from "react";
import { useClaudeDevStore } from "@/stores/useClaudeDevStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bot, ChevronDown, Zap, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVAILABLE_MODELS, type ClaudeModel } from "@/types/dev";

const MODEL_ICONS: Record<ClaudeModel, React.ReactNode> = {
  haiku: <Zap className="w-3 h-3" />,
  sonnet: <Brain className="w-3 h-3" />,
  opus: <Sparkles className="w-3 h-3" />,
};

export function ModelSelector() {
  const { selectedModel, setModel, fetchModels, isLoading, streamingMessageId } =
    useClaudeDevStore();

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const isDisabled = isLoading || streamingMessageId !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2"
          disabled={isDisabled}
        >
          <Bot className="w-3 h-3" />
          <span className="capitalize">{selectedModel}</span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {AVAILABLE_MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => setModel(model.id)}
            className={cn(
              "flex flex-col items-start gap-0.5 py-2",
              model.id === selectedModel && "bg-muted"
            )}
          >
            <div className="flex items-center gap-2 font-medium">
              {MODEL_ICONS[model.id]}
              {model.name}
            </div>
            <span className="text-xs text-muted-foreground pl-5">
              {model.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
