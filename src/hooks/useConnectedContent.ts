import { useState, useEffect } from "react";
import {
  NotebookBlock,
  DbCard,
  DbSourceItem,
  NotebookBlockAiEvaluation,
} from "@/types";

interface ConnectedContentData {
  isLoading: boolean;
  block: NotebookBlock | null;
  flashcards: DbCard[];
  sourceItem: DbSourceItem | null;
  confusionPatterns: string[];
  error: string | null;
}

export function useConnectedContent(
  blockId: string | null,
): ConnectedContentData {
  const [data, setData] = useState<ConnectedContentData>({
    isLoading: false,
    block: null,
    flashcards: [],
    sourceItem: null,
    confusionPatterns: [],
    error: null,
  });

  useEffect(() => {
    if (!blockId) {
      setData({
        isLoading: false,
        block: null,
        flashcards: [],
        sourceItem: null,
        confusionPatterns: [],
        error: null,
      });
      return;
    }

    let isMounted = true;
    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    const fetchData = async () => {
      try {
        // 1. Fetch Block
        const blockResult = await window.api.notebookBlocks.getById(blockId);
        if (blockResult.error || !blockResult.data) {
          throw new Error(blockResult.error || "Block not found");
        }
        const block = blockResult.data;

        // 2. Parallel Fetch: Flashcards & Source
        const [cardsResult, sourceResult] = await Promise.all([
          window.api.cards.getBySiblings(blockId),
          block.sourceItemId
            ? window.api.sourceItems.getById(block.sourceItemId)
            : Promise.resolve({ data: null, error: null }),
        ]);

        if (cardsResult.error)
          console.error("Failed to fetch flashcards:", cardsResult.error);
        if (sourceResult.error)
          console.error("Failed to fetch source:", sourceResult.error);

        // 3. Extract Confusion Patterns (from Block AI Eval or Cards)
        const patterns = new Set<string>();

        // From Block AI Evaluation
        if (block.aiEvaluation?.confusionTags) {
          block.aiEvaluation.confusionTags.forEach((tag) => patterns.add(tag));
        }

        // From Cards (Targeted Confusion)
        if (cardsResult.data) {
          cardsResult.data.forEach((card) => {
            if (card.targetedConfusion) patterns.add(card.targetedConfusion);
          });
        }

        if (isMounted) {
          setData({
            isLoading: false,
            block,
            flashcards: cardsResult.data || [],
            sourceItem: sourceResult.data || null,
            confusionPatterns: Array.from(patterns),
            error: null,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setData((prev) => ({
            ...prev,
            isLoading: false,
            error: err.message || "Failed to load connected content",
          }));
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [blockId]);

  return data;
}
