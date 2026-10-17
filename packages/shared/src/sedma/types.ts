import type { Card, Rank } from '../cards';
export type TeamId = 0 | 1;
export type SedmaAction = { type: 'play'; cardId: string } | { type: 'collect' };
export interface TrickCard { playerId: string; card: Card }
export interface SedmaResult {
  scores: [number, number]; winnerTeam: TeamId | null; winnerIds: string[];
  reason: 'points' | 'forfeit';
}
export interface SedmaState {
  kind: 'sedma';
  players: { id: string; hand: Card[]; team: TeamId }[];
  drawPile: Card[];
  captured: [Card[], Card[]];
  scores: [number, number];
  trick: TrickCard[];
  leadRank: Rank | null;
  leaderIndex: number;
  currentIndex: number;
  /** One circuit is complete; only the original leader may continue or collect. */
  deciding: boolean;
  lastTrick: { winnerId: string; team: TeamId; points: number; cards: TrickCard[] } | null;
  lastTrickBonus: 0 | 10;
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: SedmaResult | null;
}
export interface SedmaView {
  players: { id: string; handCount: number; team: TeamId }[];
  myHand: Card[] | null;
  drawCount: number;
  scores: [number, number];
  capturedCounts: [number, number];
  trick: TrickCard[];
  leadRank: Rank | null;
  leaderId: string;
  currentPlayerId: string;
  deciding: boolean;
  lastTrick: SedmaState['lastTrick'];
  lastTrickBonus: 0 | 10;
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: SedmaResult | null;
}
export type SedmaEvent =
  | { type: 'sedmaStarted'; dealOrder: string[]; hands: Record<string, Card[]>; startingPlayerId: string }
  | { type: 'sedmaPlayed'; playerId: string; card: Card; continuing: boolean }
  | { type: 'sedmaDrawn'; playerId: string; cards: Card[] }
  | { type: 'sedmaTurn'; playerId: string; deciding: boolean }
  | { type: 'trickResolved'; winnerId: string; team: TeamId; points: number; cards: TrickCard[]; scores: [number, number] }
  | { type: 'sedmaEnded'; result: SedmaResult };
export type SedmaClientEvent = Exclude<SedmaEvent, { type: 'sedmaStarted' | 'sedmaDrawn' }>
  | { type: 'sedmaStarted'; dealOrder: string[]; myCards: Card[]; startingPlayerId: string }
  | { type: 'sedmaDrawn'; playerId: string; count: number; cards?: Card[] };
