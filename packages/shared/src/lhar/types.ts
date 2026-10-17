import type { Card, Rank } from '../cards';
export interface LharClaim {
  id: number;
  playerId: string;
  rank: Rank;
  count: number;
}
export interface LharHistory extends LharClaim {
  outcome: 'pending' | 'accepted' | 'truth' | 'lie';
}
export interface LharResolution {
  claim: LharClaim;
  challengerId: string;
  truthful: boolean;
  revealed: Card[];
  collectorId: string;
  pileCount: number;
}
export interface LharResult {
  winnerIds: string[];
  reason: 'cards' | 'forfeit';
}
export interface LharState {
  kind: 'lhar';
  players: { id: string; hand: Card[] }[];
  pile: Card[];
  lastClaim: (LharClaim & { cards: Card[] }) | null;
  claimCounter: number;
  requiredRank: Rank;
  currentIndex: number;
  lastResolution: LharResolution | null;
  history: LharHistory[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: LharResult | null;
}
export interface LharView {
  players: { id: string; handCount: number }[];
  myHand: Card[] | null;
  pileCount: number;
  lastClaim: LharClaim | null;
  requiredRank: Rank;
  currentPlayerId: string;
  pendingWinnerId: string | null;
  lastResolution: LharResolution | null;
  history: LharHistory[];
  phase: 'playing' | 'finished';
  winnerId: string | null;
  result: LharResult | null;
}
export type LharAction =
  | { type: 'lharPlay'; cardIds: string[]; declaredRank: Rank }
  | { type: 'lharChallenge'; claimId: number }
  | { type: 'lharAccept'; claimId: number };
export type LharEvent =
  | { type: 'lharStarted'; dealOrder: string[]; hands: Record<string, Card[]>; startingPlayerId: string }
  | { type: 'lharPlayed'; claim: LharClaim; cards: Card[] }
  | { type: 'lharResolved'; resolution: LharResolution }
  | { type: 'lharTaken'; playerId: string; claimId: number; cards: Card[] }
  | { type: 'lharTurn'; playerId: string; requiredRank: Rank }
  | { type: 'lharEnded'; result: LharResult };
export type LharClientEvent =
  | Exclude<LharEvent, { type: 'lharStarted' | 'lharPlayed' | 'lharTaken' }>
  | { type: 'lharStarted'; dealOrder: string[]; myCards: Card[]; startingPlayerId: string }
  | { type: 'lharPlayed'; claim: LharClaim; myCards?: Card[] }
  | { type: 'lharTaken'; playerId: string; claimId: number; count: number; cards?: Card[] };
