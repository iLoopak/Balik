import type { Card, Suit } from '../cards';
import type { TrickPlay } from '../tricks';

export type MariasContract = 'hra' | 'betl' | 'durch';
export type MariasAction =
  | { type: 'mariasTrump'; cardId: string }
  | { type: 'mariasDeclare'; discard: string[]; contract: MariasContract }
  | { type: 'mariasPlay'; cardId: string };

export interface MariasResult {
  winnerIds: string[];
  declarerId: string;
  contract: MariasContract;
  declarerPoints: number;
  defenderPoints: number;
  reason: 'points' | 'betl' | 'durch' | 'forfeit';
}
export interface MariasState {
  kind: 'marias';
  players: { id: string; hand: Card[]; points: number; tricks: number }[];
  /** Cards still to be dealt after the trump is chosen. */
  stock: Card[];
  /** The two cards the declarer laid away. */
  talon: Card[];
  declarerIndex: number;
  phase: 'choosingTrump' | 'declaring' | 'playing' | 'finished';
  trump: Suit | null;
  trumpCard: Card | null;
  contract: MariasContract | null;
  trick: TrickPlay[];
  leaderIndex: number;
  currentIndex: number;
  marriages: { playerId: string; suit: Suit; points: number }[];
  lastTrick: { winnerId: string; cards: TrickPlay[] } | null;
  winnerId: string | null;
  result: MariasResult | null;
}
export interface MariasView {
  players: { id: string; handCount: number; points: number; tricks: number }[];
  myHand: Card[] | null;
  declarerId: string;
  phase: MariasState['phase'];
  trump: Suit | null;
  trumpCard: Card | null;
  contract: MariasContract | null;
  trick: TrickPlay[];
  leaderId: string;
  currentPlayerId: string;
  marriages: MariasState['marriages'];
  lastTrick: MariasState['lastTrick'];
  talonCount: number;
  /** Revealed when the game ends. */
  talon: Card[] | null;
  winnerId: string | null;
  result: MariasResult | null;
}
export type MariasEvent =
  | { type: 'mariasStarted'; declarerId: string; first: Card[] }
  | { type: 'mariasTrump'; playerId: string; card: Card }
  | { type: 'mariasDealt'; hands: Record<string, Card[]> }
  | { type: 'mariasDeclared'; playerId: string; contract: MariasContract; discard: Card[] }
  | { type: 'mariasPlayed'; playerId: string; card: Card; marriage: { suit: Suit; points: number } | null }
  | { type: 'mariasTrick'; winnerId: string; cards: TrickPlay[]; points: Record<string, number> }
  | { type: 'mariasTurn'; playerId: string }
  | { type: 'mariasEnded'; result: MariasResult; talon: Card[] };
export type MariasClientEvent = Exclude<MariasEvent, { type: 'mariasStarted' | 'mariasDealt' | 'mariasDeclared' }>
  | { type: 'mariasStarted'; declarerId: string; first: Card[] | null; firstCount: number }
  | { type: 'mariasDealt'; counts: Record<string, number>; myCards: Card[] }
  | { type: 'mariasDeclared'; playerId: string; contract: MariasContract; discardCount: number; discard?: Card[] };
