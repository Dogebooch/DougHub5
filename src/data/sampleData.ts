import { Card, Note } from '@/types'

const getTodayISO = (): string => {
  return new Date().toISOString()
}

const getDateOffset = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

const note1Id = 'note-acs-001'
const note2Id = 'note-hf-001'
const note3Id = 'note-neuro-001'
const note4Id = 'note-pulm-001'

const card1Id = 'card-stemi-001'
const card2Id = 'card-troponin-001'
const card3Id = 'card-bnp-001'
const card4Id = 'card-ef-001'
// Additional cards for Card Browser testing
const card5Id = 'card-stroke-001'
const card6Id = 'card-stroke-002'
const card7Id = 'card-stroke-003'
const card8Id = 'card-copd-001'
const card9Id = 'card-copd-002'
const card10Id = 'card-asthma-001'
const card11Id = 'card-pe-001'
const card12Id = 'card-pe-002'

export const sampleNotes: Note[] = [
  {
    id: note1Id,
    title: 'Acute Coronary Syndrome',
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
- **Interpretation:** Any elevation suggests myocardial injury; rising pattern indicates acute event

## Clinical Approach
1. ECG within 10 minutes of presentation
2. Serial troponins at 0 and 3-6 hours
3. Risk stratification (TIMI/GRACE scores)
4. Dual antiplatelet therapy
5. Consider cardiology consultation for high-risk features`,
    cardIds: [card1Id, card2Id],
    tags: ['cardiology', 'diagnostics', 'emergency'],
    createdAt: getTodayISO(),
  },
  {
    id: note2Id,
    title: 'Heart Failure Basics',
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
- **Severely reduced (HFrEF):** ≤30%

## Systolic vs Diastolic HF
### HFrEF (Systolic)
- Reduced contractility
- EF <40%
- Dilated ventricle
- Common causes: CAD, MI, DCM

### HFpEF (Diastolic)
- Impaired relaxation
- EF ≥50%
- Stiff ventricle
- Common causes: HTN, LVH, aging

## Diagnostic Workup
1. Clinical symptoms (dyspnea, edema, orthopnea)
2. BNP or NT-proBNP
3. Echocardiogram (assess EF and structure)
4. CXR (pulmonary edema, cardiomegaly)
5. Consider cardiac catheterization if CAD suspected`,
    cardIds: [card3Id, card4Id],
    tags: ['cardiology', 'diagnostics', 'lab-values'],
    createdAt: getTodayISO(),
  },
  {
    id: note3Id,
    title: 'Stroke Management',
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
- Extinction/inattention

## Blood Pressure Management
- Do NOT lower BP acutely unless >220/120 or receiving tPA
- tPA threshold: <185/110 before, <180/105 after`,
    cardIds: [card5Id, card6Id, card7Id],
    tags: ['neurology', 'emergency', 'stroke'],
    createdAt: getTodayISO(),
  },
  {
    id: note4Id,
    title: 'Pulmonary Emergencies',
    content: `# Pulmonary Emergencies

## COPD Exacerbation
- Bronchodilators (albuterol, ipratropium)
- Systemic steroids (prednisone 40mg x 5 days)
- Antibiotics if purulent sputum
- BiPAP if severe

## Asthma Exacerbation
- Peak flow <50% predicted = severe
- Continuous nebs + IV steroids
- Consider magnesium, epinephrine

## Pulmonary Embolism
- Wells criteria for pre-test probability
- D-dimer to rule out if low probability
- CT-PA gold standard for diagnosis`,
    cardIds: [card8Id, card9Id, card10Id, card11Id, card12Id],
    tags: ['pulmonology', 'emergency'],
    createdAt: getTodayISO(),
  },
]

export const sampleCards: Card[] = [
  {
    id: card1Id,
    front: 'What are the ECG criteria for STEMI diagnosis?',
    back: `**ST Elevation Criteria:**
- ≥1mm (0.1mV) ST elevation in 2 contiguous leads
- OR ≥2mm ST elevation in precordial leads (V1-V6)
- OR new LBBB in appropriate clinical context

**Contiguous Lead Groups:**
- Inferior: II, III, aVF → RCA territory
- Lateral: I, aVL, V5-V6 → LCx territory
- Anterior: V1-V4 → LAD territory

**Pearl:** Posterior MI shows ST depression in V1-V3 with tall R waves (mirror image)`,
    noteId: note1Id,
    tags: ['cardiology', 'diagnostics', 'emergency', 'ECG'],
    dueDate: getTodayISO(),
    createdAt: getTodayISO(),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card2Id,
    front: 'What is the timing and significance of troponin elevation in ACS?',
    back: `**Troponin Timeline:**
- Initial rise: 3-4 hours post-myocardial injury
- Peak levels: 24-48 hours
- Remains elevated: 7-14 days

**Clinical Significance:**
- ANY elevation suggests myocardial injury (not specific to ACS)
- RISING pattern indicates acute event
- Serial troponins at 0h and 3-6h to detect delta change

**High-sensitivity troponin:** Can detect earlier (1-2 hours) but less specific`,
    noteId: note1Id,
    tags: ['cardiology', 'diagnostics', 'lab-values'],
    dueDate: getTodayISO(),
    createdAt: getTodayISO(),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card3Id,
    front: 'What BNP threshold suggests heart failure diagnosis?',
    back: `**BNP Cutoffs:**
- BNP >100 pg/mL → Suggests heart failure (sensitivity ~95%)
- BNP <100 pg/mL → HF unlikely (high NPV ~90%)

**NT-proBNP (alternative):**
- >125 pg/mL suggests HF
- Higher sensitivity, longer half-life

**Confounders:**
- ↑ Renal failure, sepsis, PE, old age
- ↓ Obesity (adipose tissue clearance)

**Clinical Use:** Best for ruling OUT HF when low; less specific when elevated`,
    noteId: note2Id,
    tags: ['cardiology', 'diagnostics', 'lab-values'],
    dueDate: getTodayISO(),
    createdAt: getTodayISO(),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card4Id,
    front: 'What defines normal left ventricular ejection fraction and HF classification?',
    back: `**EF Classification:**
- Normal (HFpEF): ≥50%
- Mildly reduced: 41-49%
- Moderately reduced: 31-40%
- Severely reduced (HFrEF): ≤30%

**Clinical Implications:**
- HFrEF (EF <40%): Systolic dysfunction, benefits from GDMT (ACEi, BB, MRA, SGLT2i)
- HFpEF (EF ≥50%): Diastolic dysfunction, fewer evidence-based therapies

**Pearl:** Mid-range EF (41-49%) may respond to HFrEF therapies`,
    noteId: note2Id,
    tags: ['cardiology', 'diagnostics', 'imaging'],
    dueDate: getTodayISO(),
    createdAt: getTodayISO(),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  // Stroke cards (same sourceBlockId to test sibling feature)
  {
    id: card5Id,
    front: 'What is the time window for IV tPA in acute ischemic stroke?',
    back: `**tPA Time Window:**
- Standard: Within 4.5 hours of symptom onset
- Extended: Up to 4.5 hours with specific criteria

**Absolute Contraindications:**
- Intracranial hemorrhage
- Recent surgery/trauma
- Active bleeding
- BP >185/110 despite treatment

**Pearl:** "Time is brain" - 1.9 million neurons lost per minute in stroke`,
    noteId: note3Id,
    tags: ['neurology', 'emergency', 'stroke'],
    dueDate: getTodayISO(), // Due today
    createdAt: getTodayISO(),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card6Id,
    front: 'What are the components of the NIHSS stroke scale?',
    back: `**NIHSS Components (11 items):**
1. Level of consciousness (LOC)
2. LOC questions
3. LOC commands
4. Best gaze
5. Visual fields
6. Facial palsy
7. Motor arm (L & R)
8. Motor leg (L & R)
9. Limb ataxia
10. Sensory
11. Best language
12. Dysarthria
13. Extinction/inattention

**Scoring:** 0-42 (higher = more severe)
- 0: No stroke symptoms
- 1-4: Minor stroke
- 5-15: Moderate stroke
- >15: Severe stroke`,
    noteId: note3Id,
    tags: ['neurology', 'emergency', 'stroke'],
    dueDate: getDateOffset(-2), // Overdue by 2 days
    createdAt: getDateOffset(-10),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card7Id,
    front: 'What is the BP target in acute stroke management?',
    back: `**BP Management in Stroke:**

**WITHOUT tPA:**
- Do NOT lower unless >220/120 mmHg
- Permissive hypertension maintains perfusion

**WITH tPA:**
- Pre-tPA: Must be <185/110
- Post-tPA: Maintain <180/105 x 24 hours
- Use labetalol or nicardipine

**Pearl:** Aggressive BP lowering can worsen infarct by reducing perfusion to penumbra`,
    noteId: note3Id,
    tags: ['neurology', 'emergency', 'stroke', 'hypertension'],
    dueDate: getDateOffset(3), // Due in 3 days
    createdAt: getDateOffset(-5),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  // Pulmonary cards
  {
    id: card8Id,
    front: 'What is the standard treatment for COPD exacerbation?',
    back: `**COPD Exacerbation Treatment:**

**Bronchodilators:**
- Albuterol 2.5mg nebulized q20min x3, then q4h
- Ipratropium 0.5mg nebulized q4-6h

**Steroids:**
- Prednisone 40mg PO daily x 5 days
- No taper needed for short courses

**Antibiotics (if purulent sputum):**
- Azithromycin 500mg x 3 days, OR
- Doxycycline 100mg BID x 5 days

**Respiratory Support:**
- BiPAP if pH <7.35 or RR >25
- Intubation if deteriorating`,
    noteId: note4Id,
    tags: ['pulmonology', 'emergency', 'COPD'],
    dueDate: getTodayISO(),
    createdAt: getDateOffset(-3),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card9Id,
    front: 'When should antibiotics be given for COPD exacerbation?',
    back: `**Antibiotic Indications in COPD Exacerbation:**

**Give antibiotics if:**
- Increased sputum purulence (green/yellow), AND
- Increased sputum volume OR increased dyspnea

**Anthonisen Criteria (any 2 of 3):**
1. Increased dyspnea
2. Increased sputum volume
3. Increased sputum purulence

**Common Pathogens:**
- H. influenzae
- M. catarrhalis
- S. pneumoniae

**Pearl:** Procalcitonin can help guide antibiotic use`,
    noteId: note4Id,
    tags: ['pulmonology', 'COPD', 'antibiotics'],
    dueDate: getDateOffset(-1), // Overdue by 1 day
    createdAt: getDateOffset(-7),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card10Id,
    front: 'What peak flow indicates severe asthma exacerbation?',
    back: `**Asthma Severity by Peak Flow:**

**Mild:** >70% predicted
**Moderate:** 40-70% predicted
**Severe:** <40% predicted

**Signs of Severe Exacerbation:**
- Peak flow <40% (or <200 L/min)
- Can't speak full sentences
- RR >30, HR >120
- Accessory muscle use
- O2 sat <90%

**Impending Respiratory Failure:**
- Silent chest (no wheezing)
- Altered mental status
- Bradycardia
- Cyanosis`,
    noteId: note4Id,
    tags: ['pulmonology', 'emergency', 'asthma'],
    dueDate: getDateOffset(1), // Due tomorrow
    createdAt: getDateOffset(-2),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card11Id,
    front: 'What are the Wells criteria for pulmonary embolism?',
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
- Low probability: 0-1 points → D-dimer
- Moderate: 2-6 points → D-dimer or CT-PA
- High: >6 points → CT-PA directly

**Pearl:** If Wells ≤4 AND PERC negative, no further workup needed`,
    noteId: note4Id,
    tags: ['pulmonology', 'emergency', 'PE', 'DVT'],
    dueDate: getTodayISO(),
    createdAt: getDateOffset(-1),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
  {
    id: card12Id,
    front: 'What is the role of D-dimer in PE diagnosis?',
    back: `**D-dimer in PE Workup:**

**When to Use:**
- Low or moderate pre-test probability
- NOT useful if high probability (go to CT-PA)

**Interpretation:**
- Negative: Rules out PE (high NPV >95%)
- Positive: Does NOT confirm PE (low specificity)

**Age-Adjusted Cutoff:**
- Age >50: Use (age × 10) ng/mL as cutoff
- Example: 70 y/o → cutoff is 700 ng/mL

**False Positives:**
- Cancer, infection, trauma, surgery
- Pregnancy, inflammation
- Advanced age

**Pearl:** D-dimer is a rule-OUT test, not a rule-IN test`,
    noteId: note4Id,
    tags: ['pulmonology', 'emergency', 'PE', 'lab-values'],
    dueDate: getDateOffset(5), // Due in 5 days
    createdAt: getDateOffset(-4),
    cardType: 'qa',
    parentListId: null,
    listPosition: null,
  },
]
