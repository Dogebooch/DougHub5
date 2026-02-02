import React, { useState } from "react";
import { NotebookBlock, SourceItem } from "@/types";
// import { cn } from "@/lib/utils"; // Removed unused
import { getArchetypeTemplate } from "@/lib/archetype-templates";
import { ScrollText, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SourceFootnotes } from "./SourceFootnotes";

interface ReaderModeViewProps {
  blocks: NotebookBlock[];
  sourceItems?: Map<string, SourceItem>; // Added for footnotes
  archetype?: string;
  topicTitle?: string;
  onNodeSelect?: (id: string) => void;
}

export const ReaderModeView: React.FC<ReaderModeViewProps> = ({
  blocks,
  sourceItems = new Map(),
  archetype,
  topicTitle = "Untitled Topic",
  onNodeSelect,
}) => {
  const sections = getArchetypeTemplate(archetype);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizedContent, setSynthesizedContent] = useState<string | null>(
    null,
  );

  const handleSynthesize = async () => {
    setIsSynthesizing(true);
    try {
      const result = await window.api.ai.synthesizeArticle(
        topicTitle,
        blocks.map((b) => ({
          content: b.content,
          sourceItemId: b.id, // Using block ID as the citation target
        })),
      );
      if (result.markdown) {
        setSynthesizedContent(result.markdown);
      }
    } catch (error) {
      console.error("Synthesis failed:", error);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Extract cited block IDs from the synthesized markdown to generate footnotes
  const citedBlockIds = synthesizedContent
    ? Array.from(
        new Set(
          synthesizedContent
            .match(/\[\^([^\]]+)\]/g)
            ?.map((m) => m.slice(2, -1)),
        ),
      )
    : [];

  const footnotes = citedBlockIds.map((id, index) => {
    const block = blocks.find((b) => b.id === id);
    const sourceItem = block?.sourceItemId
      ? sourceItems.get(block.sourceItemId)
      : null;
    return {
      number: index + 1,
      sourceItemId: id,
      title:
        sourceItem?.title ||
        sourceItem?.sourceName ||
        block?.userInsight ||
        "Untitled Reference",
      siteName: sourceItem?.sourceType,
    };
  });

  return (
    <article className="max-w-none">
      {/* Chapter Outline / Quick Nav */}
      <nav className="mb-8 rounded-lg border bg-card/50 p-4 backdrop-blur-sm lg:float-right lg:ml-8 lg:mb-4 lg:w-64 lg:border-l-4 lg:border-l-primary/40 lg:bg-muted/10 lg:p-6 lg:border-y-0 lg:border-r-0">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <ScrollText className="h-4 w-4" />
            Contents
          </h3>
          <button
            onClick={handleSynthesize}
            disabled={isSynthesizing || blocks.length === 0}
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
            title="Synthesize into a unified article (AI)"
          >
            {isSynthesizing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {isSynthesizing ? "Writing..." : "Synthesize"}
          </button>
        </div>

        <ul className="space-y-2">
          {sections.map((section) => (
            <li key={section.id} className="text-sm">
              <a
                href={`#section-${section.id}`}
                className="flex items-center gap-1 text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                <ChevronRight className="h-3 w-3 opacity-50" />
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Prose Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none lg:prose-lg prose-headings:scroll-m-20">
        <p className="lead text-xl text-muted-foreground mb-8">
          {/* Placeholder lead paragraph if no explicit summary exists */}
          {/* In V2, we might extract the first block or a summary field here */}
          Overview of {archetype || "this topic"} and its clinical relevance.
        </p>

        {synthesizedContent ? (
          <div className="animate-in fade-in duration-500 bg-background/50 p-6 rounded-xl border border-primary/20 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-widest opacity-70">
              <Sparkles className="w-4 h-4" /> AI Synthesized Article
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                footnoteReference: ({ identifier }) => {
                  const fnIndex = citedBlockIds.indexOf(identifier);
                  return (
                    <sup
                      className="cursor-pointer font-bold text-primary hover:text-primary/70 transition-colors px-0.5 select-none"
                      onClick={() => onNodeSelect?.(identifier)}
                      title={`View Reference: ${identifier}`}
                    >
                      [{fnIndex !== -1 ? fnIndex + 1 : "?"}]
                    </sup>
                  );
                },
              }}
            >
              {synthesizedContent}
            </ReactMarkdown>

            {/* Footnotes Section */}
            <SourceFootnotes
              footnotes={footnotes.map((fn) => ({ ...fn, number: fn.number }))}
              onViewSource={(id) => onNodeSelect?.(id)}
            />
            <div className="mt-8 pt-4 border-t text-xs text-muted-foreground flex justify-between">
              <span>Generated by AI. Verify critical details.</span>
              <button
                onClick={() => setSynthesizedContent(null)}
                className="hover:underline"
              >
                Show Original Blocks
              </button>
            </div>
          </div>
        ) : /* Original Blocks Fallback */
        blocks.length === 0 ? (
          <div className="italic text-muted-foreground opacity-60">
            No content has been written for this topic yet. Switch to Editor
            mode to start writing.
          </div>
        ) : (
          blocks.map((block) => (
            <div key={block.id} className="mb-6">
              {/* Render content */}
              <div dangerouslySetInnerHTML={{ __html: block.content }} />
            </div>
          ))
        )}
      </div>

      <div className="mt-12 border-t pt-8 text-sm text-muted-foreground italic clear-both">
        End of article. Switch to Editor to add more content.
      </div>
    </article>
  );
};
