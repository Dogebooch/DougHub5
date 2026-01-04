export interface Card {
  id: string
  front: string
  back: string
  noteId: string
  tags: string[]
  dueDate: string
  createdAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  cardIds: string[]
  tags: string[]
  createdAt: string
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  scheduledDays: number;
  elapsedDays: number;
  review: string; // ISO timestamp of review
  createdAt: string;
}

// FSRS fields for spaced repetition (extends Card in database layer)
export interface CardFSRS {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  lastReview: string | null;
}

// Full card with FSRS fields (as stored in database)
export interface CardWithFSRS extends Card, CardFSRS {}

// IPC result wrapper for error handling
export type IpcResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
