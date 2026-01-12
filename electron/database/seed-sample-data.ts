import { cardQueries } from "./cards";
import { noteQueries } from "./notes";
import { getDatabase } from "./db-connection";
import type { DbCard, DbNote } from "./types";

export function seedSampleData(): void {
  const db = getDatabase();
  const cardCount = (
    db.prepare("SELECT COUNT(*) as count FROM cards").get() as { count: number }
  ).count;
  const noteCount = (
    db.prepare("SELECT COUNT(*) as count FROM notes").get() as { count: number }
  ).count;

  if (cardCount > 0 || noteCount > 0) {
    console.log("[Database] Skipping sample data seed (database not empty)");
    return;
  }

  console.log("[Database] Seeding sample data...");

  const getTodayISO = (): string => new Date().toISOString();
  const getDateOffset = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  };

  const note1Id = "note-acs-001";
  const note2Id = "note-hf-001";
  const note3Id = "note-neuro-001";
  const note4Id = "note-pulm-001";

  const cardIds = [
    "card-stemi-001",
    "card-troponin-001",
    "card-bnp-001",
    "card-ef-001",
    "card-stroke-001",
    "card-stroke-002",
    "card-stroke-003",
    "card-copd-001",
    "card-copd-002",
    "card-asthma-001",
    "card-pe-001",
    "card-pe-002",
  ];

  const notes: DbNote[] = [
    {
      id: note1Id,
      title: "Acute Coronary Syndrome",
      content: `# Acute Coronary Syndrome (ACS)

## Overview
ACS encompasses a spectrum of conditions caused by acute myocardial ischemia, including unstable angina, NSTEMI, and STEMI.

## STEMI Diagnostic Criteria
- **ST Elevation:** ≥1mm (0.1mV) in 2 contiguous leads, OR ≥2mm in precordial leads (V1-V6)
- **New LBBB:** In appropriate clinical context
- **Posterior MI:** ST depression V1-V3 with tall R waves

### Lead Groupings
- Inferior: II, III, aVF (RCA)
- Lateral: I, aVL, V5-V6 (LCx)
- Anterior: V1-V4 (LAD)

## Troponin Timing
- **Initial rise:** 3-4 hours post-injury
- **Peak levels:** 24-48 hours
- **Elevation duration:** 7-14 days
- **Interpretation:** Any elevation suggests myocardial injury; rising pattern indicates acute event`,
      cardIds: [cardIds[0], cardIds[1]],
      tags: ["cardiology", "diagnostics", "emergency"],
      createdAt: getTodayISO(),
    },
    {
      id: note2Id,
      title: "Heart Failure Basics",
      content: `# Heart Failure Diagnosis and Classification

## BNP in Heart Failure
- **BNP >100 pg/mL:** Suggests HF (sensitivity ~95%)
- **BNP <100 pg/mL:** High negative predictive value, HF unlikely
- **NT-proBNP >125 pg/mL:** Alternative marker with higher sensitivity
- **Confounders:** Renal failure (elevated), obesity (decreased), age (increases baseline)

## Ejection Fraction Classification
- **Normal (HFpEF):** ≥50%
- **Mildly reduced:** 41-49%
- **Moderately reduced:** 31-40%
- **Severely reduced (HFrEF):** ≤30%`,
      cardIds: [cardIds[2], cardIds[3]],
      tags: ["cardiology", "diagnostics", "lab-values"],
      createdAt: getTodayISO(),
    },
    {
      id: note3Id,
      title: "Stroke Management",
      content: `# Acute Stroke Management

## Time Windows
- tPA: Within 4.5 hours of symptom onset
- Thrombectomy: Up to 24 hours in select patients

## NIHSS Components
- Level of consciousness
- Gaze
- Visual fields
- Facial palsy
- Motor function (arms/legs)
- Ataxia
- Sensory
- Language
- Dysarthria
- Extinction/inattention`,
      cardIds: [cardIds[4], cardIds[5], cardIds[6]],
      tags: ["neurology", "emergency", "stroke"],
      createdAt: getTodayISO(),
    },
    {
      id: note4Id,
      title: "Pulmonary Emergencies",
      content: `# Pulmonary Emergencies

## COPD Exacerbation
- Bronchodilators (albuterol, ipratropium)
- Systemic steroids (prednisone 40mg x 5 days)
- Antibiotics if purulent sputum
- BiPAP if severe

## Pulmonary Embolism
- Wells criteria for pre-test probability
- D-dimer to rule out if low probability
- CT-PA gold standard for diagnosis`,
      cardIds: [cardIds[7], cardIds[8], cardIds[9], cardIds[10], cardIds[11]],
      tags: ["pulmonology", "emergency"],
      createdAt: getTodayISO(),
    },
  ];

  notes.forEach((note) => noteQueries.insert(note));

  const cards: DbCard[] = [
    {
      id: cardIds[0],
      front: "What are the ECG criteria for STEMI diagnosis?",
      back: `**ST Elevation Criteria:**
- ≥1mm (0.1mV) ST elevation in 2 contiguous leads
- OR ≥2mm ST elevation in precordial leads (V1-V6)
- OR new LBBB in appropriate clinical context

**Contiguous Lead Groups:**
- Inferior: II, III, aVF → RCA territory
- Lateral: I, aVL, V5-V6 → LCx territory
- Anterior: V1-V4 → LAD territory`,
      noteId: note1Id,
      tags: ["cardiology", "diagnostics", "emergency", "ECG"],
      dueDate: getTodayISO(),
      createdAt: getTodayISO(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[1],
      front:
        "What is the timing and significance of troponin elevation in ACS?",
      back: `**Troponin Timeline:**
- Initial rise: 3-4 hours post-myocardial injury
- Peak levels: 24-48 hours
- Remains elevated: 7-14 days

**Clinical Significance:**
- ANY elevation suggests myocardial injury (not specific to ACS)
- RISING pattern indicates acute event
- Serial troponins at 0h and 3-6h to detect delta change`,
      noteId: note1Id,
      tags: ["cardiology", "diagnostics", "lab-values"],
      dueDate: getTodayISO(),
      createdAt: getTodayISO(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[2],
      front: "What BNP threshold suggests heart failure diagnosis?",
      back: `**BNP Cutoffs:**
- BNP >100 pg/mL → Suggests heart failure (sensitivity ~95%)
- BNP <100 pg/mL → HF unlikely (high NPV ~90%)

**NT-proBNP (alternative):**
- >125 pg/mL suggests HF
- Higher sensitivity, longer half-life

**Confounders:**
- ↑ Renal failure, sepsis, PE, old age
- ↓ Obesity (adipose tissue clearance)`,
      noteId: note2Id,
      tags: ["cardiology", "diagnostics", "lab-values"],
      dueDate: getTodayISO(),
      createdAt: getTodayISO(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[3],
      front: "What defines normal left ventricular ejection fraction?",
      back: `**EF Classification:**
- Normal (HFpEF): ≥50%
- Mildly reduced: 41-49%
- Moderately reduced: 31-40%
- Severely reduced (HFrEF): ≤30%

**Clinical Implications:**
- HFrEF (EF <40%): Systolic dysfunction, benefits from GDMT
- HFpEF (EF ≥50%): Diastolic dysfunction, fewer evidence-based therapies`,
      noteId: note2Id,
      tags: ["cardiology", "diagnostics", "imaging"],
      dueDate: getTodayISO(),
      createdAt: getTodayISO(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[4],
      front: "What is the time window for IV tPA in acute ischemic stroke?",
      back: `**tPA Time Window:**
- Standard: Within 4.5 hours of symptom onset
- Extended: Up to 4.5 hours with specific criteria

**Absolute Contraindications:**
- Intracranial hemorrhage
- Recent surgery/trauma
- Active bleeding
- BP >185/110 despite treatment`,
      noteId: note3Id,
      tags: ["neurology", "emergency", "stroke"],
      dueDate: getTodayISO(),
      createdAt: getTodayISO(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[5],
      front: "What are the components of the NIHSS stroke scale?",
      back: `**NIHSS Components (11 items):**
1. Level of consciousness
2. Best gaze
3. Visual fields
4. Facial palsy
5. Motor arm
6. Motor leg
7. Limb ataxia
8. Sensory
9. Best language
10. Dysarthria
11. Extinction/inattention

**Scoring:** 0-42 (higher = more severe)`,
      noteId: note3Id,
      tags: ["neurology", "emergency", "stroke"],
      dueDate: getDateOffset(-2),
      createdAt: getDateOffset(-10),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[6],
      front: "What is the BP target in acute stroke management?",
      back: `**BP Management in Stroke:**

**WITHOUT tPA:**
- Do NOT lower unless >220/120 mmHg
- Permissive hypertension maintains perfusion

**WITH tPA:**
- Pre-tPA: Must be <185/110
- Post-tPA: Maintain <180/105 x 24 hours
- Use labetalol or nicardipine`,
      noteId: note3Id,
      tags: ["neurology", "emergency", "stroke", "hypertension"],
      dueDate: getDateOffset(3),
      createdAt: getDateOffset(-5),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[7],
      front: "What is the standard treatment for COPD exacerbation?",
      back: `**COPD Exacerbation Treatment:**

**Bronchodilators:**
- Albuterol 2.5mg nebulized q20min x3
- Ipratropium 0.5mg nebulized q4-6h

**Steroids:**
- Prednisone 40mg PO daily x 5 days

**Antibiotics (if purulent sputum):**
- Azithromycin or Doxycycline

**Respiratory Support:**
- BiPAP if pH <7.35 or RR >25`,
      noteId: note4Id,
      tags: ["pulmonology", "emergency", "COPD"],
      dueDate: getTodayISO(),
      createdAt: getDateOffset(-3),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[8],
      front: "When should antibiotics be given for COPD exacerbation?",
      back: `**Antibiotic Indications in COPD Exacerbation:**

**Give antibiotics if:**
- Increased sputum purulence (green/yellow), AND
- Increased sputum volume OR increased dyspnea

**Anthonisen Criteria (any 2 of 3):**
1. Increased dyspnea
2. Increased sputum volume
3. Increased sputum purulence`,
      noteId: note4Id,
      tags: ["pulmonology", "COPD", "antibiotics"],
      dueDate: getDateOffset(-1),
      createdAt: getDateOffset(-7),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[9],
      front: "What peak flow indicates severe asthma exacerbation?",
      back: `**Asthma Severity by Peak Flow:**

**Mild:** >70% predicted
**Moderate:** 40-70% predicted
**Severe:** <40% predicted

**Signs of Severe Exacerbation:**
- Peak flow <40% (or <200 L/min)
- Can't speak full sentences
- RR >30, HR >120
- Accessory muscle use
- O2 sat <90%`,
      noteId: note4Id,
      tags: ["pulmonology", "emergency", "asthma"],
      dueDate: getDateOffset(1),
      createdAt: getDateOffset(-2),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[10],
      front: "What are the Wells criteria for pulmonary embolism?",
      back: `**Wells Criteria for PE:**

| Criterion | Points |
|-----------|--------|
| Clinical signs of DVT | 3 |
| PE most likely diagnosis | 3 |
| Heart rate >100 | 1.5 |
| Immobilization/surgery <4 wks | 1.5 |
| Previous PE/DVT | 1.5 |
| Hemoptysis | 1 |
| Active cancer | 1 |

**Interpretation:**
- Low: 0-1 points → D-dimer
- Moderate: 2-6 points → D-dimer or CT-PA
- High: >6 points → CT-PA directly`,
      noteId: note4Id,
      tags: ["pulmonology", "emergency", "PE", "DVT"],
      dueDate: getTodayISO(),
      createdAt: getDateOffset(-1),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
    {
      id: cardIds[11],
      front: "What is the role of D-dimer in PE diagnosis?",
      back: `**D-dimer in PE Workup:**

**When to Use:**
- Low or moderate pre-test probability
- NOT useful if high probability

**Interpretation:**
- Negative: Rules out PE (high NPV >95%)
- Positive: Does NOT confirm PE (low specificity)

**Age-Adjusted Cutoff:**
- Age >50: Use (age × 10) ng/mL as cutoff
- Example: 70 y/o → cutoff is 700 ng/mL`,
      noteId: note4Id,
      tags: ["pulmonology", "emergency", "PE", "lab-values"],
      dueDate: getDateOffset(5),
      createdAt: getDateOffset(-4),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      cardType: "qa",
      parentListId: null,
      listPosition: null,
      notebookTopicPageId: null,
      sourceBlockId: null,
      aiTitle: null,
    },
  ];

  cards.forEach((card) => cardQueries.insert(card));

  console.log(
    `[Database] Seeded ${notes.length} notes and ${cards.length} cards`
  );
}
