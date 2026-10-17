import type { Card, Suit } from '../cards';

export const PRSI_HAND_SIZE = 4;
export const PRSI_MIN_PLAYERS = 2;
export const PRSI_MAX_PLAYERS = 4;

export interface PrsiPlayerState {
  id: string;
  hand: Card[];
}

/** Full authoritative state. Lives only on the server (or in tests). */
export interface PrsiState {
  players: PrsiPlayerState[];
  /** Top of the pile is the last element. */
  drawPile: Card[];
  /** Top of the pile is the last element. */
  discardPile: Card[];
  /** Suit that must be followed — differs from the top card only after a Q. */
  activeSuit: Suit;
  currentIndex: number;
  /** Accumulated 7-penalty waiting for the current player (0 = none). */
  pendingDraw: number;
  /** Set when the current player drew a playable card; only that card may be played (or pass). */
  drawnCardId: string | null;
  phase: 'playing' | 'finished';
  winnerId: string | null;
}

export type PrsiAction =
  | { type: 'play'; cardId: string; chosenSuit?: Suit }
  | { type: 'draw' }
  | { type: 'pass' };

export type DrawReason = 'normal' | 'penalty';

/**
 * Engine events: the full truth, including private card data.
 * Never send these to clients directly — use `filterEventFor`.
 */
export type PrsiEvent =
  | {
      type: 'roundStarted';
      /** One entry per dealt card, in dealing order. */
      dealOrder: string[];
      hands: Record<string, Card[]>;
      startCard: Card;
      startingPlayerId: string;
    }
  | { type: 'cardPlayed'; playerId: string; card: Card }
  | { type: 'suitChanged'; playerId: string; suit: Suit }
  | { type: 'drawPenalty'; targetPlayerId: string; total: number }
  | { type: 'deckReshuffled'; count: number }
  | { type: 'cardsDrawn'; playerId: string; cards: Card[]; reason: DrawReason }
  | { type: 'turnSkipped'; playerId: string; byPlayerId: string }
  | { type: 'passed'; playerId: string }
  | { type: 'turnChanged'; playerId: string }
  | { type: 'playerRemoved'; playerId: string }
  | { type: 'roundWon'; playerId: string };

/** What a single viewer is allowed to know about an event. */
export type PrsiClientEvent =
  | {
      type: 'roundStarted';
      dealOrder: string[];
      /** Only the viewer's own cards, in the order they were dealt to them. */
      myCards: Card[];
      startCard: Card;
      startingPlayerId: string;
    }
  | { type: 'cardPlayed'; playerId: string; card: Card }
  | { type: 'suitChanged'; playerId: string; suit: Suit }
  | { type: 'drawPenalty'; targetPlayerId: string; total: number }
  | { type: 'deckReshuffled'; count: number }
  | {
      type: 'cardsDrawn';
      playerId: string;
      count: number;
      /** Present only when the viewer is the one drawing. */
      cards?: Card[];
      reason: DrawReason;
    }
  | { type: 'turnSkipped'; playerId: string; byPlayerId: string }
  | { type: 'passed'; playerId: string }
  | { type: 'turnChanged'; playerId: string }
  | { type: 'playerRemoved'; playerId: string }
  | { type: 'roundWon'; playerId: string };

/** Per-viewer projection of the state. Contains no hidden information. */
export interface PrsiView {
  players: { id: string; handCount: number }[];
  /** null for spectators. */
  myHand: Card[] | null;
  drawCount: number;
  discardCount: number;
  /** Top few discard cards, top last. */
  discardTop: Card[];
  activeSuit: Suit;
  pendingDraw: number;
  currentPlayerId: string;
  /** Only filled for the viewer whose turn it is. */
  drawnCardId: string | null;
  phase: 'playing' | 'finished';
  winnerId: string | null;
}
