import type { Card, Suit } from '../cards';
import type { TrickPlay } from '../tricks';

/** Hra and Kilo are trump games; Betl and Durch are played without trumps. */
export type MariasContract = 'hra' | 'kilo' | 'betl' | 'durch';
export type MariasAction =
  | { type: 'mariasTrump'; cardId: string }
  /** `sedma`: the declarer also bets on winning the last trick with the 7 of trumps (trump games only). */
  | { type: 'mariasDeclare'; discard: string[]; contract: MariasContract; sedma?: boolean }
  /** Raise the stake one level (flek, re, tutti …) or pass („Dobrý“). */
  | { type: 'mariasFlek'; flek: boolean }
  | { type: 'mariasPlay'; cardId: string };

export interface MariasResult {
  winnerIds: string[];
  declarerId: string;
  contract: MariasContract;
  declarerPoints: number;
  defenderPoints: number;
  /** Declarer's points from tricks alone (cards and the last trick), without marriages. */
  declarerTrickPoints: number;
  reason: 'points' | 'betl' | 'durch' | 'forfeit';
  /** Whether the contract itself (Hra, Kilo, Betl, Durch) came off. */
  contractWon: boolean;
  /** Whether a sedma was bet, and if so whether it came off. */
  sedma: boolean;
  sedmaWon: boolean | null;
  /** Doubling level: 0 none, 1 flek, 2 re, 3 tutti … The stake is multiplied by 2^flek. */
  flek: number;
  /** Declarer's balance in stake units against each defender; positive means the declarer wins. */
  stake: number;
}
export interface MariasState {
  kind: 'marias';
  players: { id: string; hand: Card[]; points: number; tricks: number }[];
  /** Cards still to be dealt after the trump is chosen. */
  stock: Card[];
  /** The two cards the declarer laid away. */
  talon: Card[];
  declarerIndex: number;
  phase: 'choosingTrump' | 'declaring' | 'flek' | 'playing' | 'finished';
  trump: Suit | null;
  trumpCard: Card | null;
  contract: MariasContract | null;
  sedma: boolean;
  /** Current doubling level (see MariasResult.flek). */
  flek: number;
  /** Defenders who already passed in the current round of fleking. */
  flekPasses: number;
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
  sedma: boolean;
  flek: number;
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
  | { type: 'mariasDeclared'; playerId: string; contract: MariasContract; sedma: boolean; discard: Card[] }
  /** `done`: fleking is over and play begins. */
  | { type: 'mariasFlek'; playerId: string; flek: boolean; level: number; done: boolean }
  | { type: 'mariasPlayed'; playerId: string; card: Card; marriage: { suit: Suit; points: number } | null }
  | { type: 'mariasTrick'; winnerId: string; cards: TrickPlay[]; points: Record<string, number> }
  | { type: 'mariasTurn'; playerId: string }
  | { type: 'mariasEnded'; result: MariasResult; talon: Card[] };
export type MariasClientEvent = Exclude<MariasEvent, { type: 'mariasStarted' | 'mariasDealt' | 'mariasDeclared' }>
  | { type: 'mariasStarted'; declarerId: string; first: Card[] | null; firstCount: number }
  | { type: 'mariasDealt'; counts: Record<string, number>; myCards: Card[] }
  | { type: 'mariasDeclared'; playerId: string; contract: MariasContract; sedma: boolean; discardCount: number; discard?: Card[] };
