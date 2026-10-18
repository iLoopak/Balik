import type { Card, Suit } from '../cards';

export type DurakAction =
  | { type: 'durakAttack'; cardId: string }
  | { type: 'durakDefend'; cardId: string }
  | { type: 'durakTake' }
  | { type: 'durakPass' };

export interface DurakPair { attack: Card; defense: Card | null }
export interface DurakResult { winnerIds: string[]; loserId: string | null; reason: 'durak' | 'draw' | 'forfeit' }
export interface DurakState {
  kind: 'durak';
  players: { id: string; hand: Card[]; out: boolean }[];
  /** Draw pile; the last element is drawn next and talon[0] is the face-up trump. */
  talon: Card[];
  trumpCard: Card;
  trump: Suit;
  table: DurakPair[];
  attackerIndex: number;
  defenderIndex: number;
  /** Seats allowed to add attacks this bout, main attacker first. */
  throwers: string[];
  throwerPos: number;
  /** Most attacks this bout: 6 and the defender's starting hand size. */
  limit: number;
  currentIndex: number;
  discardCount: number;
  finishOrder: string[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: DurakResult | null;
}
export interface DurakView {
  players: { id: string; handCount: number; out: boolean }[];
  myHand: Card[] | null;
  talonCount: number;
  trumpCard: Card;
  trump: Suit;
  table: DurakPair[];
  attackerId: string;
  defenderId: string;
  currentPlayerId: string;
  role: 'attack' | 'defend';
  limit: number;
  discardCount: number;
  finishOrder: string[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: DurakResult | null;
}
export type DurakEvent =
  | { type: 'durakStarted'; dealOrder: string[]; hands: Record<string, Card[]>; trumpCard: Card; attackerId: string; defenderId: string }
  | { type: 'durakAttacked'; playerId: string; card: Card }
  | { type: 'durakDefended'; playerId: string; card: Card; index: number }
  | { type: 'durakPassed'; playerId: string }
  | { type: 'durakTook'; playerId: string; cards: Card[] }
  | { type: 'durakBito'; count: number }
  | { type: 'durakDrawn'; playerId: string; cards: Card[]; trumpDrawn: boolean }
  | { type: 'durakOut'; playerId: string }
  | { type: 'durakBout'; attackerId: string; defenderId: string; limit: number }
  | { type: 'durakTurn'; playerId: string; role: 'attack' | 'defend' }
  | { type: 'durakEnded'; result: DurakResult };
export type DurakClientEvent = Exclude<DurakEvent, { type: 'durakStarted' | 'durakDrawn' }>
  | { type: 'durakStarted'; dealOrder: string[]; myCards: Card[]; trumpCard: Card; attackerId: string; defenderId: string }
  | { type: 'durakDrawn'; playerId: string; count: number; trumpDrawn: boolean; cards?: Card[] };
