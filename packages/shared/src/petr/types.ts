import type { Card } from '../cards';

export type PetrAction = { type: 'petrDraw'; index: number };
export interface PetrResult { winnerIds: string[]; loserId: string | null; finishOrder: string[]; reason: 'petr' | 'forfeit' }
export interface PetrState {
  kind: 'petr';
  players: { id: string; hand: Card[]; out: boolean }[];
  /** Laid-down pairs, public. */
  pairs: { playerId: string; cards: Card[] }[];
  currentIndex: number;
  finishOrder: string[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: PetrResult | null;
}
export interface PetrView {
  players: { id: string; handCount: number; out: boolean }[];
  myHand: Card[] | null;
  pairs: PetrState['pairs'];
  currentPlayerId: string;
  /** Whose hand the current player draws from. */
  targetId: string;
  finishOrder: string[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: PetrResult | null;
}
export type PetrEvent =
  | { type: 'petrStarted'; dealOrder: string[]; hands: Record<string, Card[]>; pairs: PetrState['pairs'] }
  | { type: 'petrDrew'; playerId: string; fromId: string; index: number; card: Card; pair: Card[] | null }
  | { type: 'petrOut'; playerId: string }
  | { type: 'petrTurn'; playerId: string; targetId: string }
  | { type: 'petrEnded'; result: PetrResult };
export type PetrClientEvent = Exclude<PetrEvent, { type: 'petrStarted' | 'petrDrew' }>
  | { type: 'petrStarted'; dealOrder: string[]; myCards: Card[]; pairs: PetrState['pairs'] }
  | { type: 'petrDrew'; playerId: string; fromId: string; index: number; card?: Card; pair: Card[] | null };
