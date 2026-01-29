import React, { useState, useEffect } from "react";
import { 
  type FlashcardAnalysisResult, 
  type FlashcardAnalysisContext 
} from "../../types/ai";
import { AlertCircle, CheckCircle, RefreshCw, Sparkles } from "lucide-react";

interface FlashcardAnalysisDashboardProps {
  // Input context
  stem: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  // Metadata
  sourceItemTitle?: string;
  topicName?: string;
  // Callbacks
  onDraftAccept: (front: string, back: string) => void;
  onSaveReference: () => void;
  onCancel: () => void;
}

export const FlashcardAnalysisDashboard: React.FC<FlashcardAnalysisDashboardProps> = ({
  stem,
  userAnswer,
  correctAnswer,
  explanation,
  sourceItemTitle,
  topicName,
  onDraftAccept,
  onSaveReference,
  onCancel
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FlashcardAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Draft state (editable)
  const [draftFront, setDraftFront] = useState("");
  const [draftBack, setDraftBack] = useState("");

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await window.api.ai.analyzeFlashcard(
        stem,
        userAnswer,
        correctAnswer,
        explanation,
        "", // Let backend handle interference detection
        "medical student"
      );

      if (result.data) {
        setAnalysis(result.data);
        setDraftFront(result.data.draftCard.front);
        setDraftBack(result.data.draftCard.back);
      } else {
        setError(result.error || "Analysis failed to return data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run on mount
  useEffect(() => {
    runAnalysis();
  }, []); // Run once on mount

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if analyzing
      if (isAnalyzing) return;

      // Ctrl/Cmd + Enter -> Accept
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onDraftAccept(draftFront, draftBack);
      }

      // Escape -> Cancel
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }

      // N -> Save as Reference
      if (e.key === "n" || e.key === "N") {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
          // Allow typing 'n' in text fields
          return;
        }
        e.preventDefault();
        onSaveReference();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnalyzing, draftFront, draftBack, onDraftAccept, onCancel, onSaveReference]);

  if (isAnalyzing) {
    return (
      <div className="p-8 flex flex-col items-center justify-center space-y-4 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-700 min-h-[400px]">
        <RefreshCw className="w-12 h-12 text-blue-400 animate-spin" />
        <div className="text-xl font-medium text-white">Analyzing Knowledge Gap...</div>
        <p className="text-gray-400">Consulting AI Pedagogical Engine</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-800 rounded-xl text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-200 mb-2">Analysis Failed</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        <button 
          onClick={runAnalysis}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Header - Hero Hierarchy */}
      <div className="bg-gray-900 border-b border-gray-800 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-gray-400 mb-1">
              {topicName && <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">{topicName}</span>}
              {sourceItemTitle && <span>• {sourceItemTitle}</span>}
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Flashcard Studio
            </h2>
          </div>
          
          {/* Worthiness Badge */}
          <div className="flex flex-col items-end">
            <div className={`text-2xl font-bold ${
              analysis.worthiness.score >= 7 ? "text-green-400" :
              analysis.worthiness.score >= 4 ? "text-yellow-400" : "text-red-400"
            }`}>
              {analysis.worthiness.score}/10
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Worthiness</div>
          </div>
        </div>

        {/* Gap Diagnosis */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 flex items-start space-x-4">
           <div className={`mt-1 p-2 rounded-full ${
             analysis.gapAnalysis.type === "PURE_RECALL" ? "bg-red-500/20 text-red-400" :
             analysis.gapAnalysis.type === "MISREAD" ? "bg-yellow-500/20 text-yellow-400" :
             "bg-blue-500/20 text-blue-400"
           }`}>
             <Sparkles className="w-5 h-5" />
           </div>
           <div>
             <div className="font-semibold text-lg text-white mb-1">
               {analysis.gapAnalysis.type?.replace("_", " ")}
             </div>
             <p className="text-gray-300 leading-relaxed">
               {analysis.gapAnalysis.reasoning}
             </p>
           </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left Column: Analysis & Interference */}
        <div className="w-1/3 border-r border-gray-800 p-6 overflow-y-auto space-y-6 bg-gray-900/30">
          {/* Worthiness Rationale */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Critique</h3>
            <p className="text-sm text-gray-400 italic">
              "{analysis.worthiness.rationale}"
            </p>
          </div>

          {/* Interference Warning */}
          {analysis.interference.isDuplicate && (
            <div className="p-4 bg-orange-900/20 border border-orange-800/50 rounded-lg">
              <h4 className="text-orange-300 font-semibold mb-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Interference Risk
              </h4>
              <p className="text-sm text-orange-200/80">
                {analysis.interference.similarityNote}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Editor */}
        <div className="w-2/3 p-6 flex flex-col space-y-6 bg-gray-950">
          <div className="space-y-4 flex-1">
            {/* Front Editor */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Front (Question)</label>
              <textarea
                value={draftFront}
                onChange={(e) => setDraftFront(e.target.value)}
                className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none font-medium text-lg leading-relaxed"
                placeholder="Enter question..."
              />
            </div>

            {/* Back Editor */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Back (Answer)</label>
              <textarea
                value={draftBack}
                onChange={(e) => setDraftBack(e.target.value)}
                className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none font-medium text-lg leading-relaxed"
                placeholder="Enter answer..."
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end pt-6 border-t border-gray-800 space-x-4">
            <button 
              onClick={onSaveReference}
              className="mr-auto px-4 py-2 text-gray-400 hover:text-blue-300 transition-colors font-medium flex items-center gap-2"
              title="Save as Reference (N)"
            >
              <div className="flex items-center gap-2">
                 <span>Save Reference</span>
              </div>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-gray-700 bg-gray-900 px-1.5 font-mono text-[10px] font-medium text-gray-400 opacity-100">
                N
              </kbd>
            </button>

            <button 
              onClick={onCancel}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors font-medium flex items-center gap-2"
              title="Discard (Esc)"
            >
              Discard
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-gray-700 bg-gray-900 px-1.5 font-mono text-[10px] font-medium text-gray-400 opacity-100">
                ESC
              </kbd>
            </button>
            <button
              onClick={() => onDraftAccept(draftFront, draftBack)}
              className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/20 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
              title="Create Card (Ctrl+Enter)"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Create Card
              </div>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-blue-400/30 bg-blue-500/20 px-1.5 font-mono text-[10px] font-medium text-blue-100 opacity-100">
                ⌘↵
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
