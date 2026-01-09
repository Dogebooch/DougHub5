import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Home,
  Play,
  Zap,
  Settings,
  Inbox,
  BookOpen,
  Brain,
  Layers,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuickCapture: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenQuickCapture,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const commands: Command[] = [
    {
      id: "quick-capture",
      label: "Quick Capture",
      icon: <Zap className="h-4 w-4" />,
      action: () => {
        onOpenQuickCapture();
        onClose();
      },
      keywords: ["capture", "add", "new", "create", "dump", "save", "quick"],
    },
    {
      id: "inbox",
      label: "Go to Inbox",
      icon: <Inbox className="h-4 w-4" />,
      action: () => {
        setCurrentView("inbox");
        onClose();
      },
      keywords: ["inbox", "triage", "home", "start"],
    },
    {
      id: "review",
      label: "Go to Learn",
      icon: <Play className="h-4 w-4" />,
      action: () => {
        setCurrentView("review");
        onClose();
      },
      keywords: ["learn", "cards", "study", "review"],
    },
    {
      id: "notebook",
      label: "Go to Notebook",
      icon: <BookOpen className="h-4 w-4" />,
      action: () => {
        setCurrentView("notebook");
        onClose();
      },
      keywords: ["notebook", "notes", "topics", "curate"],
    },
    {
      id: "knowledgebank",
      label: "Go to Knowledge Bank",
      icon: <Brain className="h-4 w-4" />,
      action: () => {
        setCurrentView("knowledgebank");
        onClose();
      },
      keywords: ["bank", "knowledge", "sources", "raw"],
    },
    {
      id: "cards",
      label: "Go to Cards",
      icon: <Layers className="h-4 w-4" />,
      action: () => {
        setCurrentView("cards");
        onClose();
      },
      keywords: ["cards", "browser", "flashcards", "edit"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      action: () => {
        setCurrentView("settings");
        onClose();
      },
      keywords: ["settings", "preferences", "config"],
    },
  ];

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(searchLower)
      );
      return labelMatch || keywordMatch;
    });
  }, [search, commands]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const handleCommandClick = (command: Command) => {
    command.action();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        <div className="border-b border-border">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-14 text-base"
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  onClick={() => handleCommandClick(command)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                    {command.icon}
                  </div>
                  <span className="text-sm font-medium">{command.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center justify-between">
            <span>Navigate with ↑↓ arrows</span>
            <span>Press Enter to select</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
