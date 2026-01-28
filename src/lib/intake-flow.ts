import { SourceType } from "@/types";

export type IntakeFlowType = "full_quiz" | "takeaways" | "reference";

/**
 * Determines the appropriate intake flow based on source type.
 *
 * - full_quiz: QBank questions, manual captures - test recall with cards
 * - takeaways: Images, audio, lectures - ask "what did you learn?"
 * - reference: Articles, PDFs - add as reference, extract facts later
 */
export function getIntakeFlow(sourceType: SourceType | string | undefined | null): IntakeFlowType {
  if (!sourceType) return "reference";

  switch (sourceType.toLowerCase()) {
    case "qbank":
    case "quickcapture":
    case "manual":
      return "full_quiz";

    case "image":
    case "audio":
      return "takeaways";

    case "article":
    case "pdf":
    case "textbook":
      return "reference";
      
    default:
      return "reference";
  }
}

/**
 * Get user-friendly description of the flow
 */
export function getFlowDescription(flow: IntakeFlowType): string {
  switch (flow) {
    case "full_quiz":
      return "Test your recall with a quick quiz";
    case "takeaways":
      return "Capture your key takeaways";
    case "reference":
      return "Save as reference material";
  }
}

/**
 * Check if a flow type generates cards automatically
 */
export function flowGeneratesCards(flow: IntakeFlowType): boolean {
  return flow === "full_quiz" || flow === "takeaways";
}
