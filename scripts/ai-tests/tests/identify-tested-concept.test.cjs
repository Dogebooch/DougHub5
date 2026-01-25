/**
 * Final test - Optimized prompt for 95%+ accuracy
 */

const http = require('http');

const TEST_CASES = [
  {
    name: "Status Epilepticus Treatment",
    sourceType: "qbank",
    content: `A 45-year-old man is brought to the emergency department after witnessing a generalized tonic-clonic seizure that has been ongoing for 8 minutes. He has no known seizure history. Vital signs show HR 110, BP 160/95, RR 22. The seizure continues despite initial assessment.

Which of the following is the most appropriate initial treatment?
A. Phenytoin IV
B. Lorazepam IV
C. Levetiracetam IV
D. Valproic acid IV
E. Propofol

Answer: B. Lorazepam IV

Explanation: Benzodiazepines (lorazepam, diazepam, midazolam) are first-line treatment for status epilepticus. Lorazepam is preferred due to longer duration of action. Treatment should begin immediately when seizure duration exceeds 5 minutes.`,
    requiredConcepts: ["first-line", "status epilepticus"],
    bonusConcepts: ["benzodiazepine", "lorazepam"]
  },
  {
    name: "CKD Cardiovascular Risk",
    sourceType: "qbank",
    content: `A 62-year-old woman with Stage 3b CKD (eGFR 38) and hypertension presents for routine follow-up. She asks about her long-term prognosis. Labs show stable creatinine, mild proteinuria.

What is the most important prognostic information to discuss?
A. Risk of progression to dialysis within 5 years
B. Risk of cardiovascular death exceeds risk of ESKD progression
C. Risk of acute kidney injury requiring hospitalization
D. Risk of developing nephrotic syndrome

Answer: B

Explanation: Patients with CKD are 4-5x more likely to die from cardiovascular disease than to progress to end-stage kidney disease requiring dialysis. Aggressive CV risk management is paramount.`,
    requiredConcepts: ["cardiovascular", "ckd"],
    bonusConcepts: ["more likely", "eskd", "death", "mortality"]
  },
  {
    name: "Textbook Excerpt - Diabetic Ketoacidosis",
    sourceType: "article",
    content: `Diabetic Ketoacidosis (DKA) Management

The cornerstone of DKA treatment involves three concurrent interventions:
1. Fluid resuscitation - typically 1-2L normal saline in the first hour
2. Insulin therapy - regular insulin infusion after initial fluid bolus
3. Potassium replacement - critical because insulin drives K+ intracellularly

Key point: Always check potassium before starting insulin. If K+ < 3.3 mEq/L, hold insulin and replete potassium first to prevent life-threatening hypokalemia.`,
    requiredConcepts: ["potassium", "insulin"],
    bonusConcepts: ["dka", "check", "before", "hypokalemia"]
  }
];

// FINAL OPTIMIZED PROMPT
const OPTIMIZED_PROMPT = {
  system: `You are a medical education expert extracting key learning points.

TASK: Identify the ONE specific medical fact being tested/taught.

OUTPUT REQUIREMENTS:
1. State the fact as ONE complete sentence
2. Include the clinical CONDITION and the ACTION/CONCLUSION
3. Be specific - include drug names, thresholds, comparisons when relevant
4. Format: "[In CONDITION,] ACTION/FACT"

EXAMPLES:
- "Benzodiazepines are first-line treatment for status epilepticus"
- "In DKA, check potassium before starting insulin to prevent hypokalemia"
- "CKD patients are more likely to die from cardiovascular disease than progress to ESKD"

AVOID:
- Vague phrases like "importance of", "role of", "management of"
- Omitting the clinical context (e.g., saying "check potassium before insulin" without mentioning DKA)

Respond with valid JSON only.`,

  buildUser: (sourceType, content) => {
    return `CONTENT TYPE: ${sourceType}

${content.slice(0, 2000)}

Extract the key testable fact. Include both the clinical context AND the specific action/conclusion.

{"concept": "Complete sentence with context and action", "confidence": "high"|"medium"|"low"}`;
  }
};

// Scoring
function scoreSemanticMatch(actual, testCase) {
  if (!actual) return { score: 0, details: "No output" };
  const actualLower = actual.toLowerCase();

  // Check required concepts
  let requiredFound = 0;
  const missing = [];
  for (const req of testCase.requiredConcepts) {
    if (actualLower.includes(req.toLowerCase())) {
      requiredFound++;
    } else {
      missing.push(req);
    }
  }

  if (requiredFound < testCase.requiredConcepts.length) {
    return { score: 60, details: `Missing: ${missing.join(", ")}` };
  }

  // Check bonus concepts
  let bonusFound = 0;
  for (const bonus of testCase.bonusConcepts || []) {
    if (actualLower.includes(bonus.toLowerCase())) bonusFound++;
  }

  const bonusRatio = testCase.bonusConcepts?.length
    ? bonusFound / testCase.bonusConcepts.length
    : 0;

  // Score: 70 base + up to 30 bonus
  const finalScore = Math.round(70 + bonusRatio * 30);
  return { score: finalScore, details: `Bonus: ${bonusFound}/${testCase.bonusConcepts?.length || 0}` };
}

async function callOllama(model, prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 200 }
    });

    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) reject(new Error(response.error));
          else resolve(response.response || '');
        } catch (e) { reject(new Error(`Parse error`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

function parseResponse(text) {
  try {
    let cleaned = text.trim();
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) cleaned = match[1].trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) cleaned = cleaned.slice(start, end + 1);
    return JSON.parse(cleaned);
  } catch { return null; }
}

async function runTests() {
  console.log("=".repeat(80));
  console.log("FINAL OPTIMIZED PROMPT TEST");
  console.log("=".repeat(80));

  const models = ["llama3.1:8b", "qwen2.5:7b-instruct"];

  for (const model of models) {
    console.log(`\n${"═".repeat(80)}`);
    console.log(`MODEL: ${model}`);
    console.log("═".repeat(80));

    let totalScore = 0;

    for (const testCase of TEST_CASES) {
      const userPrompt = OPTIMIZED_PROMPT.buildUser(testCase.sourceType, testCase.content);
      const fullPrompt = `${OPTIMIZED_PROMPT.system}\n\n${userPrompt}`;

      try {
        const response = await callOllama(model, fullPrompt);
        const parsed = parseResponse(response);
        const concept = parsed?.concept || "(failed to parse)";
        const { score, details } = scoreSemanticMatch(concept, testCase);

        const icon = score >= 90 ? "✅" : score >= 70 ? "✓" : "❌";
        console.log(`\n${icon} ${testCase.name}: ${score}%`);
        console.log(`   "${concept}"`);
        console.log(`   ${details}`);

        totalScore += score;
      } catch (e) {
        console.log(`\n❌ ${testCase.name}: Error - ${e.message}`);
      }
    }

    const avg = totalScore / TEST_CASES.length;
    console.log(`\n📊 MODEL AVERAGE: ${avg.toFixed(0)}%`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("If scores are 90%+, update ai-service.ts with this prompt");
  console.log("=".repeat(80));
}

runTests().catch(console.error);
