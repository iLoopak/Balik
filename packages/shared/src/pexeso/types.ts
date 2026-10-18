import type { Card } from '../cards';

export type PexesoAction = { type: 'pexesoFlip'; index: number };
export interface PexesoResult { winnerIds: string[]; pairs: Record<string, number>; turns: number; reason: 'pairs' | 'forfeit' }
export interface PexesoState {
  kind: 'pexeso';
  players: { id: string; pairs: number }[];
  /** 32 slots; null once a pair is taken. */
  board: (Card | null)[];
  /** Slots turned face up in the current attempt (0 or 1 between actions). */
  flipped: number[];
  currentIndex: number;
  /** Completed attempts (two flips each), for the solo score. */
  turns: number;
  /** Public log of recent reveals; everyone saw these cards. */
  seen: { index: number; card: Card; turn: number }[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: PexesoResult | null;
}
export type PexesoSlot = { state: 'down' } | { state: 'up'; card: Card } | { state: 'gone' };
export interface PexesoView {
  players: { id: string; pairs: number }[];
  /** Pexeso has no hand; kept for a uniform view shape across games. */
  myHand: null;
  board: PexesoSlot[];
  currentPlayerId: string;
  turns: number;
  seen: PexesoState['seen'];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: PexesoResult | null;
}
export type PexesoEvent =
  | { type: 'pexesoStarted'; count: number; startingPlayerId: string }
  | { type: 'pexesoFlipped'; playerId: string; index: number; card: Card }
  | { type: 'pexesoMatch'; playerId: string; indices: number[]; cards: Card[] }
  | { type: 'pexesoMiss'; playerId: string; indices: number[] }
  | { type: 'pexesoTurn'; playerId: string }
  | { type: 'pexesoEnded'; result: PexesoResult };
export type PexesoClientEvent = PexesoEvent;
