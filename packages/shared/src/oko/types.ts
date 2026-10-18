import type { Card } from '../cards';

export type OkoAction = { type: 'okoHit' } | { type: 'okoStand' };
export type OkoStatus = 'waiting' | 'playing' | 'stood' | 'bust' | 'oko';
export interface OkoHandResult { bankId: string; hands: Record<string, Card[]>; totals: Record<string, number>; outcome: Record<string, 'win' | 'lose' | 'push'>; points: Record<string, number> }
export interface OkoResult { winnerIds: string[]; scores: Record<string, number>; reason: 'points' | 'forfeit' }
export interface OkoState {
  kind: 'oko';
  players: { id: string; hand: Card[]; score: number; status: OkoStatus }[];
  deck: Card[];
  bankIndex: number;
  /** 1-based number of the current hand and how many hands the match has. */
  hand: number;
  hands: number;
  currentIndex: number;
  lastHand: OkoHandResult | null;
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: OkoResult | null;
}
export interface OkoView {
  players: { id: string; handCount: number; score: number; status: OkoStatus; revealed: Card[] | null }[];
  myHand: Card[] | null;
  myTotal: number | null;
  bankId: string;
  hand: number;
  hands: number;
  deckCount: number;
  currentPlayerId: string;
  lastHand: OkoHandResult | null;
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: OkoResult | null;
}
export type OkoEvent =
  | { type: 'okoHand'; hand: number; bankId: string; dealOrder: string[]; cards: Record<string, Card[]> }
  | { type: 'okoDrew'; playerId: string; card: Card; status: OkoStatus; revealed: Card[] | null }
  | { type: 'okoStood'; playerId: string }
  | { type: 'okoTurn'; playerId: string }
  | { type: 'okoResolved'; result: OkoHandResult; scores: Record<string, number> }
  | { type: 'okoEnded'; result: OkoResult };
export type OkoClientEvent = Exclude<OkoEvent, { type: 'okoHand' | 'okoDrew' }>
  | { type: 'okoHand'; hand: number; bankId: string; dealOrder: string[]; myCards: Card[] }
  | { type: 'okoDrew'; playerId: string; status: OkoStatus; revealed: Card[] | null; card?: Card };
