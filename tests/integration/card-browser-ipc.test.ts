/**
 * Integration test for Card Browser IPC + Database Layer
 * Tests T115.3 implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { cardQueries, initializeDatabase } from '../../electron/database';
import { createMockCard } from '../helpers/mockFactories';

describe('Card Browser IPC Layer', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(__dirname, '../fixtures', `test-browser-${Date.now()}.db`);
    initializeDatabase(dbPath);
  });

  afterEach(() => {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('getBrowserList', () => {
    it('returns all cards with computed fields', () => {
      // Insert test cards
      const card1 = createMockCard({
        id: 'card-1',
        front: 'Test Question 1',
        state: 0, // New
        aiTitle: 'Test Card 1'
      });
      const card2 = createMockCard({
        id: 'card-2',
        front: 'Test Question 2',
        state: 2, // Review
        aiTitle: 'Test Card 2'
      });

      cardQueries.insert({ ...card1, aiTitle: 'Test Card 1' });
      cardQueries.insert({ ...card2, aiTitle: 'Test Card 2' });

      const results = cardQueries.getBrowserList();
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('topicName');
      expect(results[0]).toHaveProperty('siblingCount');
      expect(results[0]).toHaveProperty('isLeech');
    });

    it('filters by status', () => {
      cardQueries.insert({ ...createMockCard({ id: 'new-1', state: 0 }), aiTitle: null });
      cardQueries.insert({ ...createMockCard({ id: 'review-1', state: 2 }), aiTitle: null });

      const newCards = cardQueries.getBrowserList({ status: [0] });
      
      expect(newCards).toHaveLength(1);
      expect(newCards[0].state).toBe(0);
    });

    it('filters by search term', () => {
      cardQueries.insert({
        ...createMockCard({ id: 'cardio-1', front: 'Cardiology question' }),
        aiTitle: null
      });
      cardQueries.insert({
        ...createMockCard({ id: 'neuro-1', front: 'Neurology question' }),
        aiTitle: null
      });

      const results = cardQueries.getBrowserList({ search: 'cardio' });
      
      expect(results).toHaveLength(1);
      expect(results[0].front).toContain('Cardiology');
    });

    it('filters leeches only', () => {
      cardQueries.insert({
        ...createMockCard({ id: 'leech-1', lapses: 5 }),
        aiTitle: null
      });
      cardQueries.insert({
        ...createMockCard({ id: 'normal-1', lapses: 0 }),
        aiTitle: null
      });

      const leeches = cardQueries.getBrowserList({ leechesOnly: true });
      
      expect(leeches).toHaveLength(1);
      expect(leeches[0].id).toBe('leech-1');
      expect(leeches[0].isLeech).toBe(true);
    });

    it('sorts by difficulty descending', () => {
      cardQueries.insert({
        ...createMockCard({ id: 'easy', difficulty: 3.0 }),
        aiTitle: null
      });
      cardQueries.insert({
        ...createMockCard({ id: 'hard', difficulty: 8.5 }),
        aiTitle: null
      });

      const results = cardQueries.getBrowserList(undefined, {
        field: 'difficulty',
        direction: 'desc'
      });
      
      expect(results[0].id).toBe('hard');
      expect(results[1].id).toBe('easy');
    });

    it('handles empty filters gracefully', () => {
      cardQueries.insert({ ...createMockCard({ id: 'card-1' }), aiTitle: null });

      const results = cardQueries.getBrowserList({});
      
      expect(results).toHaveLength(1);
    });

    it('computes leech status correctly', () => {
      // Test leech condition: lapses >= 5
      cardQueries.insert({
        ...createMockCard({ id: 'leech-lapses', lapses: 6 }),
        aiTitle: null
      });
      
      // Test leech condition: lapses >= 3 AND difficulty > 0.7
      cardQueries.insert({
        ...createMockCard({ id: 'leech-diff', lapses: 3, difficulty: 0.8 }),
        aiTitle: null
      });
      
      // Test leech condition: reps >= 5 AND stability < 7
      cardQueries.insert({
        ...createMockCard({ id: 'leech-stability', reps: 6, stability: 5 }),
        aiTitle: null
      });
      
      // Normal card
      cardQueries.insert({
        ...createMockCard({ id: 'normal', lapses: 1, difficulty: 0.5, reps: 3, stability: 10 }),
        aiTitle: null
      });

      const results = cardQueries.getBrowserList();
      const leeches = results.filter(c => c.isLeech);
      
      expect(leeches).toHaveLength(3);
      expect(leeches.map(c => c.id).sort()).toEqual(['leech-diff', 'leech-lapses', 'leech-stability']);
    });
  });
});
