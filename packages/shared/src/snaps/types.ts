import type { Card, Suit } from '../cards';
import type { TrickPlay } from '../tricks';

export type SnapsAction =
  | { type: 'snapsPlay'; cardId: string; marriage?: boolean }
  | { type: 'snapsExchange' }
  | { type: 'snapsClose' };

export interface SnapsResult {
  winnerIds: string[];
  /** Game points 1–3 for the winner. */
  gamePoints: number;
  reason: 'reached66' | 'closedFailed' | 'lastTrick' | 'forfeit';
  points: Record<string, number>;
}
export interface SnapsPlayer { id: string; hand: Card[]; points: number; /** Marriage points waiting for a first trick. */ pending: number; tricks: number }
export interface SnapsState {
  kind: 'snaps';
  players: SnapsPlayer[];
  /** Face-down draw pile; the last element is drawn next. */
  talon: Card[];
  /** Face-up card under the talon; it is drawn last. */
  trumpCard: Card | null;
  trump: Suit;
  closedBy: string | null;
  trick: TrickPlay[];
  leaderIndex: number;
  currentIndex: number;
  marriages: { playerId: string; suit: Suit; points: number }[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: SnapsResult | null;
}
export interface SnapsView {
  players: { id: string; handCount: number; points: number; tricks: number; pending: number }[];
  myHand: Card[] | null;
  talonCount: number;
  trumpCard: Card | null;
  trump: Suit;
  closedBy: string | null;
  /** Follow-suit rules are in force (talon closed or exhausted). */
  strict: boolean;
  trick: TrickPlay[];
  leaderId: string;
  currentPlayerId: string;
  marriages: SnapsState['marriages'];
  phase: 'playing' | 'finished';
  result: SnapsResult | null;
}
export type SnapsEvent =
  | { type: 'snapsStarted'; dealOrder: string[]; hands: Record<string, Card[]>; trumpCard: Card; startingPlayerId: string }
  | { type: 'snapsPlayed'; playerId: string; card: Card; marriage: { suit: Suit; points: number } | null }
  | { type: 'snapsExchanged'; playerId: string; nine: Card; taken: Card }
  | { type: 'snapsClosed'; playerId: string }
  | { type: 'snapsTrick'; winnerId: string; cards: TrickPlay[]; points: Record<string, number> }
  | { type: 'snapsDrawn'; playerId: string; card: Card; fromTrump: boolean }
  | { type: 'snapsTurn'; playerId: string }
  | { type: 'snapsEnded'; result: SnapsResult };
export type SnapsClientEvent = Exclude<SnapsEvent, { type: 'snapsStarted' | 'snapsDrawn' }>
  | { type: 'snapsStarted'; dealOrder: string[]; myCards: Card[]; trumpCard: Card; startingPlayerId: string }
  | { type: 'snapsDrawn'; playerId: string; card?: Card; fromTrump: boolean };
