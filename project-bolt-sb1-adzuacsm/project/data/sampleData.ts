import { Card, Note } from '@/types'

const getTodayISO = (): string => {
  return new Date().toISOString()
}

const note1Id = 'note-acs-001'
const note2Id = 'note-hf-001'

const card1Id = 'card-stemi-001'
const card2Id = 'card-troponin-001'
const card3Id = 'card-bnp-001'
const card4Id = 'card-ef-001'

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
  },
]
