"use strict";
/**
 * Flashcard Template Engine
 *
 * Generates Practice Bank flashcards from Knowledge Entities at Forging time.
 *
 * Philosophy:
 * - 1 Golden Ticket (active by default) + 4-5 Practice Bank cards (suspended)
 * - Each archetype has specific card templates
 * - Cards only generated for fields that have data
 * - Image/Audio entities get special card types as Golden Ticket override
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCardsForEntity = generateCardsForEntity;
exports.getExpectedCardCount = getExpectedCardCount;
exports.isEntityReadyForForging = isEntityReadyForForging;
const node_crypto_1 = require("node:crypto");
const types_1 = require("./types");
// ============================================================================
// Card Templates per Archetype
// ============================================================================
/**
 * Template definitions for each archetype.
 * Each template defines:
 * - cardType: unique identifier
 * - frontTemplate: text for front of card (uses {fieldName} placeholders)
 * - backField: path to field in structuredData for back of card
 * - isGoldenTicket: whether this is the primary card
 * - priority: generation order (lower = first)
 * - conditionalField: only generate if this field exists
 */
const ILLNESS_SCRIPT_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What is the key distinguishing feature of {title}?",
        backField: "keyDiscriminator",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "pathophysiology",
        frontTemplate: "Explain the pathophysiology of {title}.",
        backField: "pathophysiology",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "pathophysiology",
    },
    {
        cardType: "presentation",
        frontTemplate: "What are the key symptoms and signs of {title}?",
        backField: "presentation",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "presentation",
    },
    {
        cardType: "epidemiology",
        frontTemplate: "Who typically gets {title}? (Epidemiology)",
        backField: "epidemiology",
        isGoldenTicket: false,
        priority: 3,
        conditionalField: "epidemiology",
    },
    {
        cardType: "diagnosis",
        frontTemplate: "What is the gold standard diagnostic test for {title}?",
        backField: "diagnostics.goldStandard",
        isGoldenTicket: false,
        priority: 4,
        conditionalField: "diagnostics",
    },
    {
        cardType: "treatment",
        frontTemplate: "What is the first-line treatment for {title}?",
        backField: "treatment",
        isGoldenTicket: false,
        priority: 5,
        conditionalField: "treatment",
    },
];
const DRUG_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What is the mechanism of action of {title}?",
        backField: "mechanismOfAction",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "indications",
        frontTemplate: "What are the primary indications for {title}?",
        backField: "indications",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "indications",
    },
    {
        cardType: "side_effects",
        frontTemplate: "What are the major side effects of {title}?",
        backField: "adverseEffects",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "adverseEffects",
    },
    {
        cardType: "black_box",
        frontTemplate: "⚠️ What is the black box warning for {title}?",
        backField: "blackBoxWarning",
        isGoldenTicket: false,
        priority: 3,
        conditionalField: "blackBoxWarning",
    },
    {
        cardType: "contraindications",
        frontTemplate: "What are the contraindications for {title}?",
        backField: "contraindications",
        isGoldenTicket: false,
        priority: 4,
        conditionalField: "contraindications",
    },
];
const PATHOGEN_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "How is {title} transmitted?",
        backField: "transmissionRoute",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "morphology",
        frontTemplate: "What is the Gram stain and morphology of {title}?",
        backField: "morphology",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "morphology",
    },
    {
        cardType: "virulence",
        frontTemplate: "What are the key virulence factors of {title}?",
        backField: "virulenceFactors",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "virulenceFactors",
    },
    {
        cardType: "diseases",
        frontTemplate: "What diseases does {title} cause?",
        backField: "diseasesCaused",
        isGoldenTicket: false,
        priority: 3,
        conditionalField: "diseasesCaused",
    },
    {
        cardType: "treatment",
        frontTemplate: "What antibiotics is {title} sensitive to?",
        backField: "antibioticSensitivity",
        isGoldenTicket: false,
        priority: 4,
        conditionalField: "antibioticSensitivity",
    },
];
const PRESENTATION_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What are the immediate life threats to consider with {title}?",
        backField: "immediateLifeThreats",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "differential",
        frontTemplate: "What is the differential diagnosis for {title}?",
        backField: "differentialDiagnosis",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "differentialDiagnosis",
    },
    {
        cardType: "red_flags",
        frontTemplate: "What are the red flags for {title}?",
        backField: "redFlags",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "redFlags",
    },
    {
        cardType: "workup",
        frontTemplate: "What is the initial diagnostic workup for {title}?",
        backField: "diagnosticAlgorithm",
        isGoldenTicket: false,
        priority: 3,
        conditionalField: "diagnosticAlgorithm",
    },
];
const IMAGING_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What is the clinical significance of {title}?",
        backField: "clinicalSignificance",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "image_occlusion",
        frontTemplate: "Identify this finding: [IMAGE]",
        backField: "findingDescription",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "findingDescription",
    },
    {
        cardType: "associated_conditions",
        frontTemplate: "What conditions are associated with {title}?",
        backField: "associatedConditions",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "associatedConditions",
    },
    {
        cardType: "next_step",
        frontTemplate: "What is the next step after finding {title}? (Urgency: {urgency})",
        backField: "associatedConditions",
        isGoldenTicket: false,
        priority: 3,
        conditionalField: "urgency",
    },
];
const DIAGNOSTIC_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What does {title} measure?",
        backField: "whatItMeasures",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "diagnostic_utility",
        frontTemplate: "What are the LR+ and LR- for {title}?",
        backField: "diagnosticUtility",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "diagnosticUtility",
    },
    {
        cardType: "indications",
        frontTemplate: "When should you order {title}?",
        backField: "indications",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "indications",
    },
];
const PROCEDURE_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What are the indications for {title}?",
        backField: "indications",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "contraindications",
        frontTemplate: "What are the contraindications for {title}?",
        backField: "contraindications",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "contraindications",
    },
    {
        cardType: "steps",
        frontTemplate: "What are the key steps in performing {title}?",
        backField: "steps",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "steps",
    },
    {
        cardType: "complications",
        frontTemplate: "What are the potential complications of {title}?",
        backField: "complications",
        isGoldenTicket: false,
        priority: 3,
        conditionalField: "complications",
    },
];
const ANATOMY_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What is the clinical relevance of {title}?",
        backField: "clinicalRelevance",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "contents",
        frontTemplate: "What are the contents of {title}?",
        backField: "contents",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "contents",
    },
    {
        cardType: "borders",
        frontTemplate: "What are the borders of {title}?",
        backField: "borders",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "borders",
    },
    {
        cardType: "vascular_supply",
        frontTemplate: "What is the vascular supply of {title}?",
        backField: "vascularSupply",
        isGoldenTicket: false,
        priority: 3,
        conditionalField: "vascularSupply",
    },
];
const ALGORITHM_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "How do you interpret the score from {title}?",
        backField: "scoringInterpretation",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "components",
        frontTemplate: "What are the components of {title}?",
        backField: "components",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "components",
    },
    {
        cardType: "action",
        frontTemplate: "What are the action thresholds for {title}?",
        backField: "nextSteps",
        isGoldenTicket: false,
        priority: 2,
        conditionalField: "nextSteps",
    },
];
const GENERIC_TEMPLATES = [
    {
        cardType: "golden_ticket",
        frontTemplate: "What is {title}? (One sentence)",
        backField: "oneSentenceSummary",
        isGoldenTicket: true,
        priority: 0,
    },
    {
        cardType: "application",
        frontTemplate: "How is {title} applied clinically?",
        backField: "importance",
        isGoldenTicket: false,
        priority: 1,
        conditionalField: "importance",
    },
];
/**
 * Map archetype type to its templates
 */
const ARCHETYPE_TEMPLATES = {
    illness_script: ILLNESS_SCRIPT_TEMPLATES,
    drug: DRUG_TEMPLATES,
    pathogen: PATHOGEN_TEMPLATES,
    presentation: PRESENTATION_TEMPLATES,
    imaging_finding: IMAGING_TEMPLATES,
    diagnostic: DIAGNOSTIC_TEMPLATES,
    procedure: PROCEDURE_TEMPLATES,
    anatomy: ANATOMY_TEMPLATES,
    algorithm: ALGORITHM_TEMPLATES,
    generic_concept: GENERIC_TEMPLATES,
};
// ============================================================================
// Card Generation Logic
// ============================================================================
/**
 * Generate all flashcards for a Knowledge Entity.
 * Called at Forging time when entity is saved with Golden Ticket completed.
 *
 * Returns: Array of DbPracticeBankFlashcard ready for insertion
 */
function generateCardsForEntity(entity) {
    const templates = ARCHETYPE_TEMPLATES[entity.entityType];
    if (!templates) {
        console.warn(`No templates found for entity type: ${entity.entityType}`);
        return [];
    }
    const cards = [];
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    // Check for image/audio override
    const hasImage = entity.structuredData?.exampleImagePath;
    const hasAudio = entity
        .audioFilePath;
    for (const template of templates) {
        // Skip if conditional field doesn't exist
        if (template.conditionalField) {
            const fieldValue = getNestedValue(entity.structuredData, template.conditionalField);
            if (!fieldValue)
                continue;
        }
        // Get the back value
        let backValue = getNestedValue(entity.structuredData, template.backField);
        if (!backValue && template.isGoldenTicket) {
            // Use goldenTicketValue for golden tickets
            backValue = entity.goldenTicketValue;
        }
        if (!backValue)
            continue;
        // Format back value (arrays become bullet lists)
        const formattedBack = formatBackValue(backValue);
        // Build front text
        let front = template.frontTemplate
            .replace(/\{title\}/g, entity.title)
            .replace(/\{urgency\}/g, String(entity.structuredData?.urgency || "routine"));
        // Handle special card types
        let cardType = template.cardType;
        const isGoldenTicket = template.isGoldenTicket;
        // Image override: Imaging/Anatomy entities get image_occlusion as Golden Ticket
        if (isGoldenTicket && hasImage) {
            if (entity.entityType === "imaging_finding" ||
                entity.entityType === "anatomy") {
                cardType = "image_occlusion";
                front = `Identify this finding:\n[IMAGE: ${entity.structuredData?.exampleImagePath}]`;
            }
        }
        // Audio override: Sound-based cards (heart sounds, lung sounds)
        if (isGoldenTicket && hasAudio) {
            cardType = "audio_recognition";
            front = `Identify this sound:\n[AUDIO: ${entity.audioFilePath}]`;
        }
        const card = {
            id: (0, node_crypto_1.randomUUID)(),
            entityId: entity.id,
            cardType,
            front,
            back: formattedBack,
            isGoldenTicket,
            isActive: isGoldenTicket, // Golden Ticket starts active, others suspended
            stability: 0,
            difficulty: 0,
            elapsedDays: 0,
            scheduledDays: 0,
            reps: 0,
            lapses: 0,
            state: 0, // New
            dueDate: isGoldenTicket ? today : null,
            lastReview: null,
            maturityState: "new",
            retiredAt: null,
            resurrectCount: 0,
            createdAt: now,
            updatedAt: now,
        };
        cards.push(card);
    }
    return cards;
}
/**
 * Get nested value from object using dot notation
 * e.g. "diagnostics.goldStandard" => obj.diagnostics.goldStandard
 */
function getNestedValue(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined)
            return undefined;
        if (typeof current !== "object")
            return undefined;
        current = current[part];
    }
    return current;
}
/**
 * Format the back value for display
 * - Arrays become bullet lists
 * - Objects are stringified
 * - Strings pass through
 */
function formatBackValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => `• ${String(item)}`).join("\n");
    }
    if (typeof value === "object" && value !== null) {
        // For complex objects like presentation { symptoms, signs }
        const lines = [];
        for (const [key, val] of Object.entries(value)) {
            if (Array.isArray(val)) {
                lines.push(`**${formatKey(key)}:**`);
                lines.push(...val.map((item) => `• ${String(item)}`));
            }
            else if (val) {
                lines.push(`**${formatKey(key)}:** ${String(val)}`);
            }
        }
        return lines.join("\n");
    }
    return String(value);
}
/**
 * Format object key for display (camelCase to Title Case)
 */
function formatKey(key) {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}
/**
 * Get the number of cards that would be generated for an entity
 * (for UI preview without actually generating)
 */
function getExpectedCardCount(entity) {
    const templates = ARCHETYPE_TEMPLATES[entity.entityType];
    if (!templates)
        return { goldenTicket: 0, practiceBank: 0 };
    let goldenTicket = 0;
    let practiceBank = 0;
    for (const template of templates) {
        if (template.conditionalField) {
            const fieldValue = getNestedValue(entity.structuredData, template.conditionalField);
            if (!fieldValue)
                continue;
        }
        const backValue = template.isGoldenTicket
            ? entity.goldenTicketValue ||
                getNestedValue(entity.structuredData, template.backField)
            : getNestedValue(entity.structuredData, template.backField);
        if (!backValue)
            continue;
        if (template.isGoldenTicket) {
            goldenTicket++;
        }
        else {
            practiceBank++;
        }
    }
    return { goldenTicket, practiceBank };
}
/**
 * Check if entity has required Golden Ticket field filled
 */
function isEntityReadyForForging(entity) {
    const goldenTicketField = types_1.GOLDEN_TICKET_FIELDS[entity.entityType];
    if (!goldenTicketField)
        return false;
    const value = getNestedValue(entity.structuredData, goldenTicketField);
    return !!value || !!entity.goldenTicketValue;
}
