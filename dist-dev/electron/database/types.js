"use strict";
/**
 * Database Type Definitions
 *
 * All TypeScript interfaces and types for the database layer.
 * Separated from database.ts for better maintainability and AI comprehension.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAILURE_ATTRIBUTION_OPTIONS = exports.GOLDEN_TICKET_FIELDS = void 0;
// Golden Ticket field mapping per archetype (for validation)
exports.GOLDEN_TICKET_FIELDS = {
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
/**
 * Archetype-specific failure attribution checklists
 */
exports.FAILURE_ATTRIBUTION_OPTIONS = {
    illness_script: [
        {
            id: "discriminator",
            label: "Didn't recognize the Key Discriminator",
            linkedCardType: "golden_ticket",
        },
        {
            id: "pathophysiology",
            label: "Confused pathophysiology with similar disease",
            linkedCardType: "pathophysiology",
        },
        {
            id: "presentation",
            label: "Forgot the classic presentation",
            linkedCardType: "presentation",
        },
        {
            id: "epidemiology",
            label: "Didn't know the epidemiology",
            linkedCardType: "epidemiology",
        },
        {
            id: "diagnosis",
            label: "Didn't know the Gold Standard test",
            linkedCardType: "diagnosis",
        },
        {
            id: "treatment",
            label: "Didn't know the first-line treatment",
            linkedCardType: "treatment",
        },
    ],
    drug: [
        {
            id: "moa",
            label: "Didn't know the Mechanism of Action",
            linkedCardType: "golden_ticket",
        },
        {
            id: "indications",
            label: "Forgot the primary indications",
            linkedCardType: "indications",
        },
        {
            id: "side_effects",
            label: "Didn't know major side effects",
            linkedCardType: "side_effects",
        },
        {
            id: "contraindications",
            label: "Forgot a critical contraindication",
            linkedCardType: "contraindications",
        },
    ],
    pathogen: [
        {
            id: "transmission",
            label: "Didn't know the transmission route",
            linkedCardType: "golden_ticket",
        },
        {
            id: "morphology",
            label: "Forgot the Gram stain / morphology",
            linkedCardType: "morphology",
        },
        {
            id: "virulence",
            label: "Didn't know virulence factors",
            linkedCardType: "virulence",
        },
        {
            id: "diseases",
            label: "Forgot which diseases it causes",
            linkedCardType: "diseases",
        },
        {
            id: "treatment",
            label: "Didn't know antibiotic sensitivity",
            linkedCardType: "treatment",
        },
    ],
    presentation: [
        {
            id: "life_threats",
            label: "Missed an Immediate Life Threat",
            linkedCardType: "golden_ticket",
        },
        {
            id: "differential",
            label: "Forgot a key differential",
            linkedCardType: "differential",
        },
        {
            id: "red_flags",
            label: "Didn't recognize a Red Flag",
            linkedCardType: "red_flags",
        },
        {
            id: "workup",
            label: "Didn't know the initial workup",
            linkedCardType: "workup",
        },
    ],
    imaging_finding: [
        {
            id: "finding",
            label: "Didn't recognize the visual finding",
            linkedCardType: "image_occlusion",
        },
        {
            id: "significance",
            label: "Forgot the clinical significance",
            linkedCardType: "clinical_significance",
        },
        {
            id: "conditions",
            label: "Didn't know associated conditions",
            linkedCardType: "associated_conditions",
        },
    ],
    diagnostic: [
        {
            id: "measures",
            label: "Didn't know what the test measures",
            linkedCardType: "golden_ticket",
        },
        {
            id: "utility",
            label: "Forgot the diagnostic utility",
            linkedCardType: "diagnostic_utility",
        },
        {
            id: "interpretation",
            label: "Didn't know how to interpret",
            linkedCardType: "interpretation",
        },
    ],
    procedure: [
        {
            id: "indications",
            label: "Forgot the indications",
            linkedCardType: "golden_ticket",
        },
        {
            id: "contraindications",
            label: "Didn't know contraindications",
            linkedCardType: "contraindications",
        },
        {
            id: "complications",
            label: "Forgot a critical complication",
            linkedCardType: "complications",
        },
    ],
    anatomy: [
        {
            id: "relevance",
            label: "Forgot the clinical relevance",
            linkedCardType: "golden_ticket",
        },
        {
            id: "contents",
            label: "Didn't know the contents",
            linkedCardType: "contents",
        },
        {
            id: "borders",
            label: "Forgot the borders",
            linkedCardType: "borders",
        },
    ],
    algorithm: [
        {
            id: "interpretation",
            label: "Didn't know how to interpret the score",
            linkedCardType: "golden_ticket",
        },
        {
            id: "components",
            label: "Forgot the components",
            linkedCardType: "components",
        },
        {
            id: "action",
            label: "Didn't know the action thresholds",
            linkedCardType: "action",
        },
    ],
    generic_concept: [
        {
            id: "concept",
            label: "Didn't understand the core concept",
            linkedCardType: "golden_ticket",
        },
        {
            id: "application",
            label: "Couldn't apply it clinically",
            linkedCardType: "application",
        },
    ],
};
