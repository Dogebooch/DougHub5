// ============================================================================
// Medical Knowledge Archetypes Types (Frontend)
// Synced from electron/database/types.ts
// ============================================================================

export type KnowledgeEntityType =
  | "illness_script"
  | "drug"
  | "pathogen"
  | "presentation"
  | "diagnostic"
  | "imaging_finding"
  | "procedure"
  | "anatomy"
  | "algorithm"
  | "generic_concept";

export type KnowledgeLinkType =
  | "treats"
  | "causes"
  | "diagnoses"
  | "presents_as"
  | "related"
  | "builds_on";

// Base entity interface
export interface KnowledgeEntity {
  id: string;
  entityType: KnowledgeEntityType;
  title: string;
  domains?: string[];
  canonicalTopicId?: string;
  parentEntityId?: string;
  structuredData: Record<string, unknown>;
  goldenTicketField?: string;
  goldenTicketValue?: string;
  aiHintGoldenTicket?: string;
  visualMnemonicTags?: string[];
  sourceItemId?: string;
  notebookBlockId?: string;
  createdAt: string;
  updatedAt: string;
}

// Archetype-specific structured data shapes
export interface IllnessScriptData {
  epidemiology?: string;
  pathophysiology?: string;
  presentation?: { symptoms: string[]; signs: string[] };
  diagnostics?: { goldStandard?: string; initialTest?: string; labs: string[] };
  treatment?: { acute?: string; chronic?: string };
  keyDiscriminator?: string; // GOLDEN TICKET
}

export interface DrugData {
  class?: string;
  mechanismOfAction?: string; // GOLDEN TICKET
  indications?: string[];
  dosing?: { standard?: string; renalAdjustment?: boolean };
  adverseEffects?: string[];
  contraindications?: string[];
  blackBoxWarning?: string;
}

export interface PathogenData {
  morphology?: string;
  virulenceFactors?: string[];
  transmissionRoute?: string; // GOLDEN TICKET
  diseasesCaused?: string[];
  antibioticSensitivity?: string[];
}

export interface PresentationData {
  history?: string;
  symptoms?: string[];
  signs?: string[];
  physicalExamFindings?: {
    finding: string;
    technique?: string;
    significance?: string;
  }[];
  differentialDiagnosis?: string[];
  immediateLifeThreats?: string; // GOLDEN TICKET
  diagnosticAlgorithm?: string;
  redFlags?: string[];
}

export interface DiagnosticData {
  whatItMeasures?: string; // GOLDEN TICKET
  diagnosticUtility?: { lrPositive?: number; lrNegative?: number };
  indications?: string[];
}

export interface ImagingFindingData {
  modality?:
    | "EKG"
    | "CXR"
    | "CT"
    | "MRI"
    | "US"
    | "Fluoro"
    | "Nuclear"
    | "Other";
  findingDescription?: string;
  clinicalSignificance?: string; // GOLDEN TICKET
  associatedConditions?: string[];
  urgency?: "critical" | "urgent" | "routine";
  exampleImagePath?: string;
}

export interface ProcedureData {
  indications?: string[]; // GOLDEN TICKET
  contraindications?: string[];
  equipment?: string[];
  steps?: string[];
  complications?: string[];
}

export interface AnatomyData {
  borders?: string;
  contents?: string[];
  vascularSupply?: string;
  clinicalRelevance?: string; // GOLDEN TICKET
}

export interface AlgorithmData {
  components?: string[];
  scoringInterpretation?: string; // GOLDEN TICKET
  nextSteps?: string;
}

export interface GenericConceptData {
  definition?: string;
  importance?: string;
  oneSentenceSummary?: string; // GOLDEN TICKET
}

// Link interface
export interface KnowledgeEntityLink {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  linkType: KnowledgeLinkType;
  createdAt: string;
}

// Golden Ticket field mapping per archetype
export const GOLDEN_TICKET_FIELDS: Record<KnowledgeEntityType, string> = {
  illness_script: "keyDiscriminator",
  drug: "mechanismOfAction",
  pathogen: "transmissionRoute",
  presentation: "immediateLifeThreats",
  diagnostic: "whatItMeasures",
  imaging_finding: "clinicalSignificance",
  procedure: "indications",
  anatomy: "clinicalRelevance",
  algorithm: "scoringInterpretation",
  generic_concept: "oneSentenceSummary",
};

// Human-readable archetype labels
export const ARCHETYPE_LABELS: Record<KnowledgeEntityType, string> = {
  illness_script: "Disease / Illness Script",
  drug: "Drug / Medication",
  pathogen: "Pathogen (Bacteria/Virus/Fungus)",
  presentation: "Presentation / Chief Complaint",
  diagnostic: "Diagnostic Test (Lab/Imaging)",
  imaging_finding: "Imaging Finding (EKG/Radiology)",
  procedure: "Procedure / Skill",
  anatomy: "Anatomy",
  algorithm: "Algorithm / Scoring System",
  generic_concept: "General Concept",
};

// Golden Ticket prompts per archetype
export const GOLDEN_TICKET_PROMPTS: Record<KnowledgeEntityType, string> = {
  illness_script: "What's the KEY finding that distinguishes this disease?",
  drug: "How does this drug work? (Mechanism of Action)",
  pathogen: "How is this pathogen transmitted?",
  presentation: "What life-threatening conditions must you rule out FIRST?",
  diagnostic: "What does this test actually measure?",
  imaging_finding: "What's the clinical significance of this finding?",
  procedure: "What are the main indications for this procedure?",
  anatomy: "Why is this structure clinically important?",
  algorithm: "How do you interpret the score/result?",
  generic_concept: "Summarize this concept in ONE sentence.",
};

// Icons per archetype (Lucide icon names)
export const ARCHETYPE_ICONS: Record<KnowledgeEntityType, string> = {
  illness_script: "Stethoscope",
  drug: "Pill",
  pathogen: "Bug",
  presentation: "AlertCircle",
  diagnostic: "FlaskConical",
  imaging_finding: "Activity",
  procedure: "Syringe",
  anatomy: "Bone",
  algorithm: "Calculator",
  generic_concept: "Lightbulb",
};
