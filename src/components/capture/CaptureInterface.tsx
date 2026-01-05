import { useState, useEffect, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { CardWithFSRS, Note } from "@/types";
import { ExtractedConcept, ValidationResult } from "@/types/ai";
import { ConceptCheckbox } from "./ConceptCheckbox";
import { ValidationWarning } from "./ValidationWarning";

/** Processing state for the capture workflow */
type ProcessingState = "idle" | "extracting" | "validating" | "saving";

/** Extended concept with validation info */
interface ConceptWithValidation extends ExtractedConcept {
  validation?: ValidationResult;
  isValidating?: boolean;
}

/** LocalStorage key for draft recovery */
const DRAFT_STORAGE_KEY = "doughub-capture-draft";

export function CaptureInterface() {
  const { addCard, addNote } = useAppStore();

  // Core state for AI-guided workflow
  const [pastedContent, setPastedContent] = useState("");
  const [extractedConcepts, setExtractedConcepts] = useState<ConceptWithValidation[]>([]);
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const { content, timestamp } = JSON.parse(savedDraft);
        // Only restore if less than 24 hours old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000 && content) {
          setPastedContent(content);
          toast.info("Recovered unsaved draft");
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Auto-save draft to localStorage every 5 seconds
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (pastedContent.trim()) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({ content: pastedContent, timestamp: Date.now() })
          );
        } catch {
          // Ignore storage errors
        }
      }, 5000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [pastedContent]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && extractedConcepts.length > 0) {
        if (document.activeElement?.closest('[role="listbox"]')) return;
        setExtractedConcepts([]);
        setSelectedConcepts(new Set());
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [extractedConcepts.length]);

  // Handle paste event - auto-trigger extraction
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (text.trim()) {
      setPastedContent(text);
      // Auto-extract after paste (with small delay for state update)
      setTimeout(() => handleExtractConcepts(text), 100);
    }
  };

  // Extract concepts from pasted content using AI
  const handleExtractConcepts = async (content?: string) => {
    const textToProcess = content || pastedContent;
    if (!textToProcess.trim()) {
      toast.error("Please paste or enter content first");
      return;
    }

    setProcessingState("extracting");
    setExtractedConcepts([]);
    setSelectedConcepts(new Set());

    try {
      // First check for medical lists
      const listResult = await window.api.ai.detectMedicalList(textToProcess);
      if (listResult.data?.isList) {
        toast.info(
          `Detected ${listResult.data.listType} list with ${listResult.data.items.length} items`,
          { description: "Consider using clinical vignettes for better recall" }
        );
      }

      // Extract concepts
      const result = await window.api.ai.extractConcepts(textToProcess);

      if (result.error) {
        toast.error("Failed to extract concepts", { description: result.error });
        setProcessingState("idle");
        return;
      }

      if (!result.data || result.data.length === 0) {
        toast.warning("No concepts extracted", {
          description: "Try pasting more specific medical content",
        });
        setProcessingState("idle");
        return;
      }

      // Set concepts and auto-select all
      const conceptsWithValidation: ConceptWithValidation[] = result.data.map((c) => ({
        ...c,
        validation: undefined,
        isValidating: false,
      }));

      setExtractedConcepts(conceptsWithValidation);
      setSelectedConcepts(new Set(result.data.map((c) => c.id)));
      setProcessingState("idle");

      toast.success(`Extracted ${result.data.length} concepts`);

      // Start validating selected concepts
      validateConcepts(conceptsWithValidation);
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Extraction failed");
      setProcessingState("idle");
    }
  };

  // Validate concepts using AI
  const validateConcepts = async (concepts: ConceptWithValidation[]) => {
    for (const concept of concepts) {
      // Generate front/back based on format
      const { front, back } = generateCardContent(concept);

      // Mark as validating
      setExtractedConcepts((prev) =>
        prev.map((c) =>
          c.id === concept.id ? { ...c, isValidating: true } : c
        )
      );

      try {
        const result = await window.api.ai.validateCard(
          front,
          back,
          concept.suggestedFormat
        );

        setExtractedConcepts((prev) =>
          prev.map((c) =>
            c.id === concept.id
              ? { ...c, validation: result.data ?? undefined, isValidating: false }
              : c
          )
        );
      } catch {
        setExtractedConcepts((prev) =>
          prev.map((c) =>
            c.id === concept.id ? { ...c, isValidating: false } : c
          )
        );
      }
    }
  };

  // Generate card front/back from concept
  const generateCardContent = (concept: ConceptWithValidation): { front: string; back: string } => {
    if (concept.suggestedFormat === "cloze") {
      // For cloze, text is the answer, create a question
      return {
        front: `What is: {{c1::${concept.text}}}?`,
        back: concept.text,
      };
    }
    // For Q&A, use concept type to frame question
    return {
      front: `What is ${concept.conceptType.toLowerCase()}: ${concept.text}?`,
      back: concept.text,
    };
  };

  // Toggle concept selection
  const toggleConcept = useCallback((id: string) => {
    setSelectedConcepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Update concept content
  const updateConcept = useCallback((id: string, updates: Partial<ExtractedConcept>) => {
    setExtractedConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  // Create cards from selected concepts
  const handleCreateCards = async () => {
    const selected = extractedConcepts.filter((c) => selectedConcepts.has(c.id));

    if (selected.length === 0) {
      toast.error("Please select at least one concept");
      return;
    }

    setProcessingState("saving");
    const saveStart = performance.now();

    try {
      // Create parent note with source content
      const noteId = crypto.randomUUID();
      const noteTitle = pastedContent.slice(0, 50).trim() || "Extracted concepts";
      const now = new Date().toISOString();

      const note: Note = {
        id: noteId,
        title: noteTitle,
        content: pastedContent,
        cardIds: [],
        tags: [],
        createdAt: now,
      };

      const noteResult = await addNote(note);
      if (!noteResult.success) {
        toast.error("Failed to create note", { description: noteResult.error });
        setProcessingState("idle");
        return;
      }

      // Create cards from selected concepts
      let successCount = 0;
      let errorCount = 0;
      const createdCardIds: string[] = [];

      for (const concept of selected) {
        const { front, back } = generateCardContent(concept);

        const cardWithFSRS: CardWithFSRS = {
          id: crypto.randomUUID(),
          front,
          back,
          noteId,
          tags: [],
          dueDate: now,
          createdAt: now,
          cardType: concept.suggestedFormat === "cloze" ? "cloze" : "qa",
          parentListId: null,
          listPosition: null,
          // FSRS defaults
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          state: 0,
          lastReview: null,
        };

        const result = await addCard(cardWithFSRS);
        if (result.success) {
          successCount++;
          createdCardIds.push(cardWithFSRS.id);
        } else {
          errorCount++;
          console.error(`Failed to create card: ${result.error}`);
        }
      }

      // Measure save time for <500ms feedback requirement
      const saveTime = performance.now() - saveStart;

      if (successCount > 0) {
        // Show success within 500ms
        toast.success(`Saved ${successCount} card${successCount > 1 ? "s" : ""}!`, {
          description: saveTime < 500 ? undefined : `Took ${Math.round(saveTime)}ms`,
        });

        // Clear draft from localStorage
        localStorage.removeItem(DRAFT_STORAGE_KEY);

        // Reset state
        setPastedContent("");
        setExtractedConcepts([]);
        setSelectedConcepts(new Set());
      }

      if (errorCount > 0) {
        toast.error(`Failed to create ${errorCount} card${errorCount > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save cards");
    } finally {
      setProcessingState("idle");
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd+Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (extractedConcepts.length > 0 && selectedConcepts.size > 0) {
        handleCreateCards();
      } else if (pastedContent.trim()) {
        handleExtractConcepts();
      }
      return;
    }

    // Enter to proceed when concepts are extracted
    if (e.key === "Enter" && !e.shiftKey && extractedConcepts.length > 0) {
      e.preventDefault();
      handleCreateCards();
      return;
    }
  };

  // Check if there are validation warnings
  const hasWarnings = extractedConcepts.some(
    (c) => selectedConcepts.has(c.id) && c.validation && !c.validation.isValid
  );

  const isProcessing = processingState !== "idle";

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-semibold text-foreground flex items-center justify-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          AI-Guided Capture
        </h1>
        <p className="text-muted-foreground">
          Paste your notes and let AI extract flashcard concepts
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Phase 1: Paste Area */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Step 1: Paste your content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              ref={textareaRef}
              placeholder="Paste your medical notes, textbook excerpts, or lecture content here...

Example: 'Aspirin irreversibly inhibits cyclooxygenase (COX-1 and COX-2), blocking prostaglandin synthesis. This reduces inflammation, fever, and platelet aggregation.'"
              className="min-h-[150px] resize-none"
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
            />

            {pastedContent.trim() && extractedConcepts.length === 0 && (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => handleExtractConcepts()}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {processingState === "extracting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Extract Concepts
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase 2: Extracted Concepts */}
        {extractedConcepts.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Step 2: Select concepts to create cards</span>
                <span className="text-xs">
                  {selectedConcepts.size}/{extractedConcepts.length} selected
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {extractedConcepts.map((concept) => (
                <div key={concept.id} className="space-y-2">
                  <ConceptCheckbox
                    concept={concept}
                    isSelected={selectedConcepts.has(concept.id)}
                    onToggle={() => toggleConcept(concept.id)}
                    onEdit={(updates) => updateConcept(concept.id, updates)}
                  />

                  {/* Validation warnings */}
                  {concept.validation && !concept.validation.isValid && selectedConcepts.has(concept.id) && (
                    <ValidationWarning validation={concept.validation} />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Phase 3: Create Cards */}
        {extractedConcepts.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {hasWarnings && (
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  Some cards have warnings
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPastedContent("");
                  setExtractedConcepts([]);
                  setSelectedConcepts(new Set());
                  localStorage.removeItem(DRAFT_STORAGE_KEY);
                }}
                disabled={isProcessing}
              >
                Clear
              </Button>
              <Button
                onClick={handleCreateCards}
                disabled={selectedConcepts.size === 0 || isProcessing}
                size="lg"
                className="gap-2"
              >
                {processingState === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  `Create ${selectedConcepts.size} Card${selectedConcepts.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Keyboard hints */}
        <p className="text-center text-sm text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Tab</kbd> to navigate •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Space</kbd> to toggle •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to create
        </p>
      </div>
    </div>
  );
}
