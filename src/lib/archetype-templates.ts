export interface ArchetypeSection {
  id: string;
  title: string;
}

export const ARCHETYPE_TEMPLATES: Record<string, ArchetypeSection[]> = {
  // Disease / Condition
  disease: [
    { id: "overview", title: "Overview" },
    { id: "etiology", title: "Etiology & Pathophysiology" },
    { id: "clinical_features", title: "Clinical Presentation" },
    { id: "diagnosis", title: "Calculations & Diagnosis" },
    { id: "management", title: "Management & Treatment" },
    { id: "complications", title: "Complications & Prognosis" },
  ],
  // Drug / Pharmacology
  drug: [
    { id: "overview", title: "Class & Overview" },
    { id: "moa", title: "Mechanism of Action" },
    { id: "indications", title: "Clinical Indications" },
    { id: "pharmacokinetics", title: "Pharmacokinetics" },
    { id: "adverse_effects", title: "Adverse Effects & Toxicity" },
    { id: "interactions", title: "Contraindications & Interactions" },
  ],
  // Procedure
  procedure: [
    { id: "indications", title: "Indications" },
    { id: "contraindications", title: "Contraindications" },
    { id: "equipment", title: "Equipment" },
    { id: "technique", title: "Technique" },
    { id: "complications", title: "Complications" },
    { id: "post_procedure", title: "Post-Procedure Care" },
  ],
  // Anatomy
  anatomy: [
    { id: "overview", title: "Overview" },
    { id: "relations", title: "Relations & Boundaries" },
    { id: "neurovasculature", title: "Neurovasculature" },
    { id: "function", title: "Physiological Function" },
    { id: "clinical", title: "Clinical Significance" },
  ],
  // Default fallback
  generic: [
    { id: "overview", title: "Overview" },
    { id: "details", title: "Details" },
    { id: "pearls", title: "Clinical Pearls" },
  ],
};

export function getArchetypeTemplate(
  archetypeName?: string | null,
): ArchetypeSection[] {
  if (!archetypeName) return ARCHETYPE_TEMPLATES.generic;
  const normalized = archetypeName.toLowerCase();
  return ARCHETYPE_TEMPLATES[normalized] || ARCHETYPE_TEMPLATES.generic;
}
