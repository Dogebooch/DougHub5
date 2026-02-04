import { useState, useRef, useEffect } from "react";
import { useNeuralPaneStore } from "@/stores/useNeuralPaneStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Bot,
  Activity,
  Terminal,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

type MessageType = "system" | "user" | "assistant" | "error";

interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  metadata?: any;
}

export function NeuralPane() {
  const { isOpen, toggle, activePhase, backendLogic, userNotes } =
    useNeuralPaneStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      type: "assistant",
      content:
        "**Neural Link Active.** ready to assist with medical analysis and flashcard generation.",
      timestamp: Date.now(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [inputText, setInputText] = useState("");
  const [aiLogs, setAiLogs] = useState<
    Array<{
      id: string;
      status: string;
      message: string;
      timestamp: number;
    }>
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Listen for AI logs from backend
  useEffect(() => {
    if (window.api?.ai?.onLog) {
      const cleanup = window.api.ai.onLog((log) => {
        // Store log for Logs tab
        const logEntry = {
          id: `log-${Date.now()}-${Math.random()}`,
          status: log.status,
          message: log.message,
          timestamp: Date.now(),
        };
        setAiLogs((prev) => [...prev, logEntry]);

        // Update typing indicator
        if (log.status === "pending") {
          setIsTyping(true);
        } else if (log.status === "success" || log.status === "error") {
          setIsTyping(false);
        }
      });
      return cleanup;
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: inputText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      // Call AI task (advisor by default)
      const result = await window.api.ai.runTask("advisor", {
        userMessage: inputText,
      });

      setIsTyping(false);

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: result.recommendation || result.message || "Task completed.",
        timestamp: Date.now(),
        metadata: { taskId: "advisor" },
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: "error",
        content: `Failed to process request: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={toggle}
          className="h-14 w-14 rounded-full shadow-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:scale-105 transition-all duration-300 group"
        >
          <Sparkles className="h-6 w-6 text-teal-400 group-hover:rotate-12 transition-transform" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-[400px] border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col shadow-2xl transition-all duration-300 z-40 h-full",
      )}
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="h-5 w-5 text-teal-500" />
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border-2 border-slate-900"></div>
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-700 dark:text-slate-200">
            Neural Link
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-500 font-medium">
            v5.0
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-slate-200"
            onClick={toggle}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-2 pt-2">
          <TabsList className="w-full grid grid-cols-2 bg-slate-200/50 dark:bg-slate-800/50">
            <TabsTrigger
              value="chat"
              className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700"
            >
              <Zap className="h-3 w-3 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700"
            >
              <Terminal className="h-3 w-3 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Chat Content */}
        <TabsContent value="chat" className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-6 pb-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1 max-w-[90%]",
                    msg.type === "user" ? "ml-auto items-end" : "mr-auto",
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.type === "user"
                        ? "bg-teal-600 text-white rounded-tr-sm"
                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm",
                      msg.type === "error" &&
                        "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-600",
                    )}
                  >
                    {msg.type === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 px-1 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 mr-auto px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium animate-pulse">
                    Analyzing context...
                  </span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Logs Content */}
        <TabsContent value="logs" className="flex-1 overflow-hidden h-full">
          <ScrollArea className="h-full">
            <div className="p-4 font-mono text-[10px] space-y-2">
              <div className="flex gap-2 text-slate-500">
                <span className="text-teal-500">➜</span>
                <span>System initialized...</span>
              </div>
              {aiLogs.map((log) => (
                <div key={log.id} className="flex gap-2 items-start">
                  <span
                    className={cn(
                      log.status === "success" && "text-green-500",
                      log.status === "error" && "text-red-500",
                      log.status === "pending" && "text-yellow-500",
                      !log.status && "text-teal-500",
                    )}
                  >
                    {log.status === "success"
                      ? "✓"
                      : log.status === "error"
                        ? "✗"
                        : "➜"}
                  </span>
                  <div className="flex-1">
                    <span className="text-slate-400 mr-2">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
        <form className="relative" onSubmit={handleSubmit}>
          <input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-3.5 pr-12 text-sm focus:ring-2 focus:ring-teal-500/50 focus:outline-none transition-all placeholder:text-slate-400"
            placeholder="Ask Neural Link..."
            disabled={isTyping}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isTyping || !inputText.trim()}
            className="absolute right-1.5 top-1.5 h-8 w-8 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="h-4 w-4 fill-current" />
          </Button>
        </form>
      </div>
    </div>
  );
}
