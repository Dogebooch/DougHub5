/**
 * FSRS Test Helpers
 * 
 * Utilities for testing FSRS scheduling logic with medical content.
 */

import { Rating } from 'ts-fsrs'

/**
 * Create mock FSRS card state
 */
export function createMockFSRSState(overrides: Partial<{
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  reps: number
  lapses: number
  state: number
  lastReview: string | null
}> = {}) {
  return {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 0, // 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
    lastReview: null,
    ...overrides,
  }
}

/**
 * Create mock review log with performance tracking
 */
export function createMockReviewLog(overrides: Partial<{
  id: string
  cardId: string
  rating: number
  state: number
  reviewedAt: string
  responseTimeMs: number | null
  partialCreditScore: number | null
}> = {}) {
  return {
    id: `log-${Date.now()}`,
    cardId: 'card-1',
    rating: Rating.Good,
    state: 1,
    reviewedAt: new Date().toISOString(),
    responseTimeMs: null,
    partialCreditScore: null,
    ...overrides,
  }
}

/**
 * Validate partial credit score is in valid range [0.0, 1.0]
 */
export function isValidPartialCredit(score: number | null): boolean {
  if (score === null) return true
  return score >= 0.0 && score <= 1.0
}

/**
 * Validate response time is valid (null or >= 0)
 */
export function isValidResponseTime(timeMs: number | null): boolean {
  if (timeMs === null) return true
  return timeMs >= 0
}

/**
 * Convert milliseconds to human-readable format for assertions
 */
export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

/**
 * Medical domain tags for realistic testing
 */
export const MEDICAL_DOMAINS = [
  'cardiology',
  'pulmonology',
  'nephrology',
  'gastroenterology',
  'endocrinology',
  'hematology',
  'infectious-disease',
  'neurology',
  'rheumatology',
  'emergency-medicine',
  'pharmacology',
  'pathophysiology',
] as const

/**
 * Sample medical card content for testing
 */
export const SAMPLE_MEDICAL_CARDS = {
  vignette: {
    front: '58yo M with sudden chest pain radiating to back, BP 180/110 in R arm, 130/85 in L arm. Most likely diagnosis?',
    back: 'Aortic dissection (Type A if ascending aorta involved)',
    tags: ['cardiology', 'emergency-medicine'],
    cardType: 'vignette',
  },
  cloze: {
    front: 'Treatment for HOCM involves {{c1::beta-blockers}} or {{c2::verapamil}} to reduce {{c3::outflow obstruction}}',
    back: 'Treatment for HOCM involves beta-blockers or verapamil to reduce outflow obstruction',
    tags: ['cardiology'],
    cardType: 'cloze',
  },
  qa: {
    front: 'What is the mechanism of action of spironolactone?',
    back: 'Aldosterone antagonist - blocks mineralocorticoid receptor in collecting duct',
    tags: ['pharmacology', 'nephrology'],
    cardType: 'qa',
  },
} as const

/**
 * Simulate realistic review response times by domain
 * Based on cognitive load research
 */
export const DOMAIN_RESPONSE_TIMES = {
  'pharmacology': 8000, // More complex, needs thinking
  'pathophysiology': 7000,
  'cardiology': 6000,
  'emergency-medicine': 5000, // Pattern recognition
  'basic-facts': 3000, // Quick recall
} as const

/**
 * Generate realistic response time based on domain and rating
 */
export function generateRealisticResponseTime(
  domain: string,
  rating: Rating
): number {
  // Base time by domain
  const baseTime = DOMAIN_RESPONSE_TIMES[domain as keyof typeof DOMAIN_RESPONSE_TIMES] || 5000
  
  // Adjust by rating (Again = longer, Easy = shorter)
  let ratingMultiplier = 1.0
  if (rating === Rating.Again) ratingMultiplier = 1.5
  else if (rating === Rating.Hard) ratingMultiplier = 1.2
  else if (rating === Rating.Good) ratingMultiplier = 1.0
  else if (rating === Rating.Easy) ratingMultiplier = 0.7
  
  // Add some randomness (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4
  
  return Math.floor(baseTime * ratingMultiplier * randomFactor)
}

/**
 * Generate realistic partial credit score
 * For medical lists: 3/5 correct = 0.6
 */
export function calculatePartialCredit(
  correctCount: number,
  totalCount: number
): number {
  return Number((correctCount / totalCount).toFixed(2))
}

/**
 * Simulate a review session with realistic timing
 */
export function simulateReviewSession(cardCount: number, domain: string = 'cardiology') {
  const reviews = []
  
  for (let i = 0; i < cardCount; i++) {
    // Simulate varying performance
    const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
    const rating = ratings[Math.floor(Math.random() * ratings.length)]
    
    reviews.push({
      cardId: `card-${i}`,
      rating,
      responseTimeMs: generateRealisticResponseTime(domain, rating),
      partialCreditScore: rating === Rating.Again ? calculatePartialCredit(2, 5) : null,
    })
  }
  
  return reviews
}
