import React, { useEffect } from "react";
import { useDevStore } from "@/stores/useDevStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Copy, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AILogEntry } from "@/types/dev";

export function AIDevPanel() {
  const { isOpen, setOpen } = useDevStore();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-[90vw] sm:w-[540px] flex flex-col p-0 gap-0"
      >
        <AIDevPanelContent />
      </SheetContent>
    </Sheet>
  );
}

export function AIDevPanelContent() {
  const { logs, settings, updateSetting, clearLogs, fetchSettings, isOpen } =
    useDevStore();

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">AI Dev Panel</h2>
      </div>

      <Tabs defaultValue="inspector" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2 border-b bg-muted/20">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inspector">Inspector ({logs.length})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inspector" className="flex-1 min-h-0 m-0 relative">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex justify-end p-2 border-b bg-muted/10">
              <Button variant="ghost" size="sm" onClick={clearLogs} className="h-8">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {logs.length === 0 && (
                  <div className="text-center text-muted-foreground py-10">
                    No logs captured yet.
                  </div>
                )}
                {logs.map((log) => (
                  <LogItem key={log.id} log={log} />
                ))}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 p-6 m-0 overflow-y-auto">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Model Override</Label>
              <Input
                placeholder="e.g. gpt-4-turbo"
                value={settings["aiModel"] || ""}
                onChange={(e) => updateSetting("aiModel", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use system default.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Temperature Override</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {settings["aiTemperature"] || "Default"}
                </span>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={[parseFloat(settings["aiTemperature"] || "0")]}
                onValueChange={(vals) =>
                  updateSetting("aiTemperature", vals[0].toString())
                }
                className={!settings["aiTemperature"] ? "opacity-50" : ""}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("aiTemperature", "")}
                  disabled={!settings["aiTemperature"]}
                >
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetting("aiTemperature", "0.3")}
                >
                  Set 0.3
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Tokens Override</Label>
              <Input
                type="number"
                value={settings["aiMaxTokens"] || ""}
                onChange={(e) => updateSetting("aiMaxTokens", e.target.value)}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogItem({ log }: { log: AILogEntry }) {
  const [expanded, setExpanded] = React.useState(false);

  // Helper to copy JSON
  const copyData = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {log.status === "pending" ? (
             <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
          ) : log.status === "success" ? (
             <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
             <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <div className="flex flex-col min-w-0">
             <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{log.reason || log.endpoint}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1">{log.model}</Badge>
             </div>
             <span className="text-xs text-muted-foreground truncate">
                {format(log.timestamp, "HH:mm:ss.SSS")} • {log.latencyMs > 0 ? `${log.latencyMs}ms` : "Processing..."}
                {log.tokens && ` • ${log.tokens.total} toks`}
             </span>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="p-3 border-t bg-muted/10 text-xs font-mono space-y-4">
             {log.error && (
                <div className="text-red-500 bg-red-500/10 p-2 rounded">
                    <strong>Error:</strong> {log.error}
                </div>
             )}
             
             <div>
                <div className="flex justify-between items-center mb-1">
                    <strong className="text-muted-foreground">Request</strong>
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); copyData(log.request); }}>
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
                <div className="bg-background border rounded p-2 overflow-x-auto max-h-[200px]">
                    <pre>{JSON.stringify(log.request, null, 2)}</pre>
                </div>
             </div>

             {log.response && (
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <strong className="text-muted-foreground">Response</strong>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); copyData(log.response); }}>
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="bg-background border rounded p-2 overflow-x-auto max-h-[300px]">
                        <pre>{JSON.stringify(log.response, null, 2)}</pre>
                    </div>
                 </div>
             )}
        </div>
      )}
    </div>
  );
}
