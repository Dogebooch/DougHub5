/**
 * Integration test for AI extraction with Ollama
 * 
 * This test requires Ollama running locally on localhost:11434
 * with qwen2.5:7b-instruct model
 */

import { describe, it, expect, beforeAll } from 'vitest';
import http from 'node:http';
import * as aiService from '../../electron/ai-service';

// Check if Ollama is available
async function checkOllama(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:11434/api/tags', (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    setTimeout(() => {
      req.destroy();
      resolve(false);
    }, 2000);
  });
}

describe('Ollama AI Extraction Integration Tests', () => {
  beforeAll(async () => {
    const isAvailable = await checkOllama();
    if (!isAvailable) {
      throw new Error(
        'Ollama not available. Please start Ollama with: ollama serve\n' +
        'And ensure qwen2.5:7b-instruct is pulled: ollama pull qwen2.5:7b-instruct'
      );
    }

    // Force Ollama provider
    process.env['AI_PROVIDER'] = 'ollama';
    
    // Initialize with Ollama config
    await aiService.initializeClient(aiService.PROVIDER_PRESETS.ollama);
  });

  it('should extract concepts from medical content', async () => {
    const medicalContent = `
# Acute Coronary Syndrome

**Definition**: Spectrum of conditions caused by acute myocardial ischemia, including unstable angina, NSTEMI, and STEMI.

**Pathophysiology**: Plaque rupture → thrombus formation → coronary artery occlusion

**Classic presentation**: Chest pain radiating to left arm/jaw, diaphoresis, dyspnea

**Diagnosis**: ECG changes + elevated cardiac biomarkers (troponin)

**Treatment**: MONA (Morphine, Oxygen, Nitroglycerin, Aspirin) + anticoagulation
    `.trim();

    console.log('\n🧪 Testing AI extraction with Ollama...\n');
    console.log('Input content:');
    console.log(medicalContent);
    console.log('\n' + '='.repeat(80) + '\n');

    const result = await aiService.extractConcepts(medicalContent);

    console.log('✅ Extraction Results:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // Validate structure
    expect(result).toBeDefined();
    expect(result.concepts).toBeDefined();
    expect(Array.isArray(result.concepts)).toBe(true);

    // Should extract multiple concepts
    expect(result.concepts.length).toBeGreaterThan(0);

    // Check concept structure
    if (result.concepts.length > 0) {
      const concept = result.concepts[0];
      console.log('First concept:', concept);
      
      expect(concept).toHaveProperty('text');
      expect(concept).toHaveProperty('conceptType');
      expect(concept).toHaveProperty('confidence');
      expect(concept).toHaveProperty('suggestedFormat');
      
      // Validate concept types
      const validTypes = ['definition', 'mechanism', 'clinical-finding', 'diagnosis', 'treatment', 'other'];
      expect(validTypes).toContain(concept.conceptType);
      
      // Validate format suggestions
      const validFormats = ['qa', 'cloze'];
      expect(validFormats).toContain(concept.suggestedFormat);
      
      // Confidence should be between 0 and 1
      expect(concept.confidence).toBeGreaterThanOrEqual(0);
      expect(concept.confidence).toBeLessThanOrEqual(1);
    }
  }, 60000); // 60s timeout for AI processing

  it('should validate card quality', async () => {
    const goodQuestion = 'What are the classic ECG findings in STEMI?';
    const goodAnswer = 'ST elevation ≥1mm in 2+ contiguous leads, new LBBB, or posterior MI pattern (tall R wave in V1-V2)';

    console.log('\n🧪 Testing card validation...\n');
    console.log('Question:', goodQuestion);
    console.log('Answer:', goodAnswer);
    console.log('\n' + '='.repeat(80) + '\n');

    const result = await aiService.validateCard(goodQuestion, goodAnswer);

    console.log('✅ Validation Results:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    expect(result).toBeDefined();
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('suggestions');
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
  }, 30000);

  it('should detect medical lists', async () => {
    const listContent = `
5 H's and T's of Cardiac Arrest:
1. Hypovolemia
2. Hypoxia
3. Hydrogen ion (acidosis)
4. Hypo/hyperkalemia
5. Hypothermia
6. Tension pneumothorax
7. Tamponade (cardiac)
8. Toxins
9. Thrombosis (pulmonary)
10. Thrombosis (coronary)
    `.trim();

    console.log('\n🧪 Testing medical list detection...\n');
    console.log('Content:', listContent);
    console.log('\n' + '='.repeat(80) + '\n');

    const result = await aiService.detectMedicalList(listContent);

    console.log('✅ List Detection Results:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    expect(result).toBeDefined();
    expect(result).toHaveProperty('isList');
    expect(result).toHaveProperty('listType');
    expect(result).toHaveProperty('items');
    
    if (result.isList) {
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    }
  }, 30000);

  it('should convert list item to clinical vignette', async () => {
    const item = 'Tension pneumothorax';
    const context = 'Reversible causes of cardiac arrest (H\'s and T\'s)';

    console.log('\n🧪 Testing vignette conversion...\n');
    console.log('Item:', item);
    console.log('Context:', context);
    console.log('\n' + '='.repeat(80) + '\n');

    const result = await aiService.convertToVignette(item, context);

    console.log('✅ Vignette Results:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    expect(result).toBeDefined();
    expect(result).toHaveProperty('vignette');
    expect(result).toHaveProperty('cloze');
    expect(typeof result.vignette).toBe('string');
    expect(typeof result.cloze).toBe('string');
    expect(result.vignette.length).toBeGreaterThan(0);
    expect(result.cloze).toContain('{{c1::');
  }, 30000);

  it('should suggest relevant medical tags', async () => {
    const content = 'Patient with acute MI treated with aspirin and PCI';

    console.log('\n🧪 Testing tag suggestions...\n');
    console.log('Content:', content);
    console.log('\n' + '='.repeat(80) + '\n');

    const result = await aiService.suggestTags(content);

    console.log('✅ Tag Suggestions:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Should suggest cardiology-related tags
    const lowerTags = result.map(t => t.toLowerCase());
    const hasCardiology = lowerTags.some(t => 
      t.includes('cardio') || t.includes('acs') || t.includes('mi')
    );
    expect(hasCardiology).toBe(true);
  }, 30000);
});
