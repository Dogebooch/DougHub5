import { useCallback, useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/stores/useAppStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  ExternalLink,
  Database,
  Cpu,
  BookOpen,
  Trash2,
  Download,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Card as CardType } from "@/types";

export function SettingsView() {
  const { toast } = useToast();
  const settings = useAppStore((state) => state.settings);
  const updateSetting = useAppStore((state) => state.updateSetting);
  const [isPurging, setIsPurging] = useState(false);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [duplicateCards, setDuplicateCards] = useState<CardType[]>([]);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
  const [isReextractingMetadata, setIsReextractingMetadata] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{
    current: number;
    total: number;
    succeeded: number;
    failed: number;
    currentItem?: string;
    status?: "running" | "cancelled" | "restoring" | "complete";
  } | null>(null);
  const [isReparsingQuestions, setIsReparsingQuestions] = useState(false);
  const [reparseProgress, setReparseProgress] = useState<{
    current: number;
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    async function loadDbPath() {
      if (window.api?.db?.getPath) {
        const result = await window.api.db.getPath();
        if (result.data) setDbPath(result.data);
      }
    }
    loadDbPath();
  }, []);

  const handlePurgeArchive = useCallback(async () => {
    if (!window.api?.sourceItems?.purgeRawPages) {
      toast({
        title: "Purge Failed",
        description: "API not available",
        variant: "destructive",
      });
      return;
    }

    setIsPurging(true);
    try {
      const result = await window.api.sourceItems.purgeRawPages();

      if (result.error) {
        toast({
          title: "Purge Failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Raw HTML Archive Purged",
          description: "Successfully removed archived webpage data.",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Purge Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsPurging(false);
    }
  }, [toast]);

  const handleBackup = useCallback(async () => {
    try {
      const result = await window.api.backup.create();
      if (result.error) {
        toast({
          title: "Backup Failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Backup Created",
          description: `Database backup saved successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: String(error),
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFetchOllamaModels = useCallback(async () => {
    if (!window.api?.ai?.getOllamaModels) {
      toast({
        title: "Not Available",
        description: "Ollama detection API not available",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingModels(true);
    try {
      const result = await window.api.ai.getOllamaModels();

      if (result.error) {
        toast({
          title: "Failed to Detect Models",
          description: result.error,
          variant: "destructive",
        });
        setAvailableModels([]);
      } else if (result.data && result.data.length > 0) {
        setAvailableModels(result.data);
        toast({
          title: "Models Found",
          description: `Found ${result.data.length} local model${
            result.data.length === 1 ? "" : "s"
          }`,
        });
      } else {
        setAvailableModels([]);
        toast({
          title: "No Models Found",
          description:
            'Ollama is running but no models are installed. Run "ollama pull <model>" to install.',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Detection Failed",
        description: String(error),
        variant: "destructive",
      });
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, [toast]);

  const handleScanDuplicates = useCallback(async () => {
    setIsLoadingDuplicates(true);
    try {
      const result = await window.api.cards.findDuplicateFrontBack();
      if (result.error) {
        toast({
          title: "Scan Failed",
          description: result.error,
          variant: "destructive",
        });
        setDuplicateCards([]);
      } else {
        setDuplicateCards(result.data || []);
        if (result.data && result.data.length > 0) {
          toast({
            title: "Duplicates Found",
            description: `Found ${result.data.length} card${
              result.data.length === 1 ? "" : "s"
            } with duplicate front/back content`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "No Duplicates",
            description: "All cards look good!",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Scan Failed",
        description: String(error),
        variant: "destructive",
      });
      setDuplicateCards([]);
    } finally {
      setIsLoadingDuplicates(false);
    }
  }, [toast]);

  const handleCancelReextract = useCallback(async () => {
    if (!window.api?.sourceItems?.cancelReextract) return;
    await window.api.sourceItems.cancelReextract();
  }, []);

  const handleReextractMetadata = useCallback(
    async (overwrite: boolean) => {
      if (
        !window.api?.sourceItems?.reextractMetadata ||
        !window.api?.sourceItems?.onReextractProgress
      ) {
        toast({
          title: "Not Available",
          description: "Re-extraction API not available",
          variant: "destructive",
        });
        return;
      }

      setIsReextractingMetadata(true);
      setExtractionProgress({
        current: 0,
        total: 0,
        succeeded: 0,
        failed: 0,
        status: "running",
      });

      // Subscribe to progress updates
      const unsubscribe = window.api.sourceItems.onReextractProgress(
        (progress) => {
          setExtractionProgress(progress);
        }
      );

      try {
        const result = await window.api.sourceItems.reextractMetadata({
          overwrite,
        });

        if (result.error) {
          toast({
            title: "Re-extraction Failed",
            description: result.error,
            variant: "destructive",
          });
        } else if (result.data) {
          const { processed, succeeded, failed, cancelled, restored } =
            result.data;
          if (cancelled) {
            toast({
              title: "Re-extraction Cancelled",
              description: restored
                ? "Database restored to previous state."
                : `Stopped at ${processed} questions.`,
            });
          } else if (processed === 0) {
            toast({
              title: "Nothing to Process",
              description: "All questions already have metadata.",
            });
          } else {
            toast({
              title: "Re-extraction Complete",
              description: `Processed ${processed} questions: ${succeeded} succeeded, ${failed} failed.`,
              variant: failed > 0 ? "destructive" : "default",
            });
          }
        }
      } catch (error) {
        toast({
          title: "Re-extraction Failed",
          description: String(error),
          variant: "destructive",
        });
      } finally {
        unsubscribe();
        setIsReextractingMetadata(false);
        setExtractionProgress(null);
      }
    },
    [toast]
  );

  const handleReparseQuestions = useCallback(
    async (siteName?: "MKSAP 19" | "ACEP PeerPrep") => {
      if (
        !window.api?.sourceItems?.reparseAllFromRaw ||
        !window.api?.sourceItems?.onReparseProgress
      ) {
        toast({
          title: "Not Available",
          description: "Re-parse API not available",
          variant: "destructive",
        });
        return;
      }

      setIsReparsingQuestions(true);
      setReparseProgress({
        current: 0,
        total: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      });

      // Subscribe to progress updates
      const unsubscribe = window.api.sourceItems.onReparseProgress(
        (progress) => {
          setReparseProgress(progress);
        }
      );

      try {
        const result = await window.api.sourceItems.reparseAllFromRaw(
          siteName ? { siteName } : undefined
        );

        if (result.error) {
          toast({
            title: "Re-parse Failed",
            description: result.error,
            variant: "destructive",
          });
        } else if (result.data) {
          const { processed, succeeded, failed, skipped } = result.data;
          if (processed === 0 || (succeeded === 0 && skipped === processed)) {
            toast({
              title: "Nothing to Process",
              description: "No questions with stored HTML found.",
            });
          } else {
            toast({
              title: "Re-parse Complete",
              description: `Processed ${processed}: ${succeeded} updated, ${failed} failed, ${skipped} skipped.`,
              variant: failed > 0 ? "destructive" : "default",
            });
          }
        }
      } catch (error) {
        toast({
          title: "Re-parse Failed",
          description: String(error),
          variant: "destructive",
        });
      } finally {
        unsubscribe();
        setIsReparsingQuestions(false);
        setReparseProgress(null);
      }
    },
    [toast]
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-foreground/80 mt-1">
            Configure application behavior, AI providers, and data management.
          </p>
        </div>
      </div>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="bg-surface-elevated/50 p-1 border border-border">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            AI Provider
          </TabsTrigger>
          <TabsTrigger value="study" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Study Algo
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data & Backup
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Data Quality
          </TabsTrigger>
        </TabsList>

        {/* AI SETTINGS */}
        <TabsContent value="ai" className="space-y-6 outline-none">
          <Card className="border-border bg-surface-elevated/30">
            <CardHeader>
              <CardTitle>AI Provider & Models</CardTitle>
              <CardDescription className="text-foreground/80">
                Choose which AI model powers concept extraction and card
                generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Provider</Label>
                  <Select
                    value={settings.aiProvider}
                    onValueChange={(val: any) =>
                      updateSetting("aiProvider", val)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.aiProvider === "openai" && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="openai-key">OpenAI API Key</Label>
                      <Input
                        id="openai-key"
                        type="password"
                        placeholder="sk-..."
                        value={settings.openaiApiKey}
                        onChange={(e) =>
                          updateSetting("openaiApiKey", e.target.value)
                        }
                        className="font-mono"
                      />
                      <p className="text-xs text-foreground/80">
                        Stored locally. Never shared. Requires billing enabled
                        at{" "}
                        <a
                          href="https://platform.openai.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          OpenAI <ExternalLink className="h-2 w-2" />
                        </a>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Model Selector</Label>
                      <Select
                        value={settings.openaiModel}
                        onValueChange={(val) =>
                          updateSetting("openaiModel", val)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">gpt-4o (Best)</SelectItem>
                          <SelectItem value="gpt-4o-mini">
                            gpt-4o-mini (Fast/Cheap)
                          </SelectItem>
                          <SelectItem value="o1-preview">
                            o1-preview (Power)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {settings.aiProvider === "anthropic" && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                      <Input
                        id="anthropic-key"
                        type="password"
                        placeholder="sk-ant-..."
                        value={settings.anthropicApiKey}
                        onChange={(e) =>
                          updateSetting("anthropicApiKey", e.target.value)
                        }
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model Selector</Label>
                      <Select
                        value={settings.anthropicModel}
                        onValueChange={(val) =>
                          updateSetting("anthropicModel", val)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-3-5-sonnet-20240620">
                            Claude 3.5 Sonnet
                          </SelectItem>
                          <SelectItem value="claude-3-haiku-20240307">
                            Claude 3 Haiku
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {settings.aiProvider === "ollama" && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="ollama-model">Ollama Model</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleFetchOllamaModels}
                          disabled={isLoadingModels}
                          className="gap-2 shrink-0"
                        >
                          <Database className="h-3.5 w-3.5" />
                          {isLoadingModels ? "Detecting..." : "Detect Models"}
                        </Button>
                        {availableModels.length > 0 ? (
                          <Select
                            value={settings.ollamaModel}
                            onValueChange={(val) =>
                              updateSetting("ollamaModel", val)
                            }
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableModels.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="ollama-model"
                            placeholder="qwen2.5:7b-instruct, llama3, etc."
                            value={settings.ollamaModel}
                            onChange={(e) =>
                              updateSetting("ollamaModel", e.target.value)
                            }
                            className="flex-1"
                          />
                        )}
                      </div>
                      <p className="text-xs text-foreground/80">
                        {availableModels.length > 0
                          ? `${availableModels.length} model${
                              availableModels.length === 1 ? "" : "s"
                            } detected on your system.`
                          : "Click 'Detect Models' to scan your local Ollama installation."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STUDY SETTINGS */}
        <TabsContent value="study" className="outline-none">
          <Card className="border-border bg-surface-elevated/30">
            <CardHeader>
              <CardTitle>FSRS Algorithm</CardTitle>
              <CardDescription className="text-foreground/80">
                Customize the spaced-repetition scheduler. Automatic
                optimization coming soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Request Retention</Label>
                    <p className="text-sm text-foreground/80">
                      Higher = more reviews, but better memory. DougHub
                      recommends 0.89.
                    </p>
                  </div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {(settings.fsrsRequestRetention * 100).toFixed(0)}%
                  </div>
                </div>
                <Slider
                  min={0.8}
                  max={0.95}
                  step={0.01}
                  value={[settings.fsrsRequestRetention]}
                  onValueChange={([val]) =>
                    updateSetting("fsrsRequestRetention", val)
                  }
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-foreground/80 px-1 font-medium">
                  <span>80% (Light Load)</span>
                  <span>DougHub Default (89%)</span>
                  <span>95% (Heavy Load)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA SETTINGS */}
        <TabsContent value="data" className="space-y-6 outline-none">
          <Card className="border-border bg-surface-elevated/30">
            <CardHeader>
              <CardTitle>Storage & Files</CardTitle>
              <CardDescription className="text-foreground/80">
                Manage your data footprint and security.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-start justify-between p-4 rounded-lg bg-surface-base border border-border">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Database Location</p>
                    <p className="text-xs text-foreground/80 break-all font-mono">
                      {dbPath || "Loading..."}
                    </p>
                  </div>
                  <Database className="h-4 w-4 text-muted-foreground mt-1" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Manual Backup</p>
                    <p className="text-sm text-foreground/80">
                      Create a snapshot of your database now.
                    </p>
                  </div>
                  <Button
                    onClick={handleBackup}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Run Backup
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Purge Raw HTML Archive</p>
                    <p className="text-sm text-foreground/80 leading-snug max-w-[400px]">
                      Removes captured webpage source code to free space. Cards
                      and notes are <strong>not</strong> affected.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPurging}
                        className="gap-2"
                      >
                        {isPurging ? "Purging..." : "Purge Archive"}
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Purge Raw HTML Archive?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all stored source code from webpage
                          captures. It frees up disk space but you won't be able
                          to re-examine the original webpage source. Your cards
                          and notes stay safe.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handlePurgeArchive}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Purge Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DATA QUALITY TAB */}
        <TabsContent value="quality" className="space-y-6 outline-none">
          <Card className="border-border bg-surface-elevated/30">
            <CardHeader>
              <CardTitle>Card Quality Issues</CardTitle>
              <CardDescription className="text-foreground/80">
                Scan for and fix data quality problems.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Duplicate Front/Back Cards</p>
                    <p className="text-sm text-foreground/80 leading-snug max-w-[400px]">
                      Find cards where the question (front) and answer (back)
                      are identical—usually caused by vignette generation
                      issues.
                    </p>
                  </div>
                  <Button
                    onClick={handleScanDuplicates}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingDuplicates}
                    className="gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {isLoadingDuplicates ? "Scanning..." : "Scan Now"}
                  </Button>
                </div>

                {duplicateCards.length > 0 && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-destructive">
                            {duplicateCards.length} Duplicate{" "}
                            {duplicateCards.length === 1 ? "Card" : "Cards"}{" "}
                            Found
                          </p>
                          <p className="text-sm text-destructive/80">
                            These cards have identical front and back content.
                            Review and fix them manually in the Card Browser.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {duplicateCards.map((card) => (
                        <div
                          key={card.id}
                          className="p-3 rounded-md bg-muted/50 border border-border text-sm space-y-2"
                        >
                          <div className="font-mono text-xs text-muted-foreground">
                            ID: {card.id.slice(0, 8)}...
                          </div>
                          <div className="text-foreground/90 line-clamp-2">
                            {card.front}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Created:</span>
                            <span>
                              {new Date(card.createdAt).toLocaleDateString()}
                            </span>
                            {card.cardType && (
                              <>
                                <span>•</span>
                                <span className="capitalize">
                                  {card.cardType}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-surface-elevated/30">
            <CardHeader>
              <CardTitle>AI Metadata</CardTitle>
              <CardDescription className="text-foreground/80">
                Re-extract AI-generated summaries, topics, and tags for board
                questions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Re-extract Question Metadata</p>
                    <p className="text-sm text-foreground/80 leading-snug max-w-[400px]">
                      Uses AI to regenerate summaries and classifications for
                      all captured board questions. Useful after AI prompt
                      improvements.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReextractMetadata(false)}
                      variant="outline"
                      size="sm"
                      disabled={isReextractingMetadata}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {isReextractingMetadata ? "Running..." : "Fill Missing"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isReextractingMetadata}
                          className="gap-2"
                        >
                          <Sparkles className="h-4 w-4 text-warning" />
                          Re-extract All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Re-extract All Metadata?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will re-run AI extraction on ALL board
                            questions, overwriting existing summaries and
                            classifications. This may take a while and will use
                            API credits.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleReextractMetadata(true)}
                          >
                            Re-extract All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Re-parse Questions Section */}
                <div className="flex items-center justify-between border-t pt-6">
                  <div>
                    <p className="font-medium">Re-parse Question HTML</p>
                    <p className="text-sm text-foreground/80 leading-snug max-w-[400px]">
                      Re-parses stored raw HTML to update question display
                      (vignette, answers, explanation). Use after parser fixes.
                      Preserves attempt history and downloaded images.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReparseQuestions("MKSAP 19")}
                      variant="outline"
                      size="sm"
                      disabled={isReparsingQuestions || isReextractingMetadata}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {isReparsingQuestions ? "Running..." : "MKSAP Only"}
                    </Button>
                    <Button
                      onClick={() => handleReparseQuestions()}
                      variant="outline"
                      size="sm"
                      disabled={isReparsingQuestions || isReextractingMetadata}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      All Questions
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Progress Dialog for Re-parsing */}
      <Dialog open={isReparsingQuestions} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              Re-parsing Questions
            </DialogTitle>
            <DialogDescription>
              Updating parsed content from stored HTML...
            </DialogDescription>
          </DialogHeader>

          {reparseProgress && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Progress: {reparseProgress.current} / {reparseProgress.total}
                  </span>
                  <span className="text-muted-foreground">
                    {reparseProgress.total > 0
                      ? Math.round(
                          (reparseProgress.current / reparseProgress.total) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    reparseProgress.total > 0
                      ? (reparseProgress.current / reparseProgress.total) * 100
                      : 0
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-success/10 rounded-md p-2">
                  <div className="font-semibold text-success">
                    {reparseProgress.succeeded}
                  </div>
                  <div className="text-xs text-muted-foreground">Updated</div>
                </div>
                <div className="bg-destructive/10 rounded-md p-2">
                  <div className="font-semibold text-destructive">
                    {reparseProgress.failed}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="bg-muted rounded-md p-2">
                  <div className="font-semibold text-muted-foreground">
                    {reparseProgress.skipped}
                  </div>
                  <div className="text-xs text-muted-foreground">Skipped</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Progress Dialog for AI Extraction */}
      <Dialog open={isReextractingMetadata} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {extractionProgress?.status === "restoring" ? (
                <>
                  <Database className="h-5 w-5 text-warning animate-pulse" />
                  Restoring Backup
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  Extracting AI Metadata
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {extractionProgress?.status === "restoring"
                ? "Reverting database to previous state..."
                : "Processing board questions. A backup was created before starting."}
            </DialogDescription>
          </DialogHeader>
          {extractionProgress && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {extractionProgress.current} / {extractionProgress.total}
                  </span>
                </div>
                <Progress
                  value={
                    extractionProgress.total > 0
                      ? (extractionProgress.current / extractionProgress.total) *
                        100
                      : 0
                  }
                  className="h-2"
                />
              </div>

              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{extractionProgress.succeeded} succeeded</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>{extractionProgress.failed} failed</span>
                </div>
              </div>

              {extractionProgress.currentItem &&
                extractionProgress.status === "running" && (
                  <div className="text-xs text-muted-foreground truncate border-t pt-3 mt-3">
                    Processing: {extractionProgress.currentItem}
                  </div>
                )}

              {extractionProgress.status === "running" && (
                <div className="flex justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelReextract}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel & Restore
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
