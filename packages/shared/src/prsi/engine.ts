import { createDeck32, isSuit, shuffle, type Card, type Rng, type Suit } from '../cards';
import {
  PRSI_HAND_SIZE,
  PRSI_MAX_PLAYERS,
  PRSI_MIN_PLAYERS,
  type DrawReason,
  type PrsiAction,
  type PrsiEvent,
  type PrsiState,
} from './types';

export type ApplyResult =
  | { ok: true; state: PrsiState; events: PrsiEvent[] }
  | { ok: false; error: PrsiError };

export type PrsiError =
  | 'finished'
  | 'not-your-turn'
  | 'card-not-in-hand'
  | 'card-not-playable'
  | 'must-play-drawn-card'
  | 'suit-required'
  | 'already-drew'
  | 'cannot-pass'
  | 'unknown-action';

/** Cards with an effect; never used as the opening discard. */
export function isSpecial(card: Card): boolean {
  return card.rank === '7' || card.rank === 'A' || card.rank === 'Q';
}

export interface PlayContext {
  top: Card;
  activeSuit: Suit;
  pendingDraw: number;
}

/**
 * Core matching rule.
 * - While a 7-penalty is pending, only another 7 may be played.
 * - Q (svršek) may be played on anything and changes the suit.
 * - Otherwise suit must match the active suit or rank must match the top card.
 */
export function isPlayable(card: Card, ctx: PlayContext): boolean {
  if (ctx.pendingDraw > 0) return card.rank === '7';
  if (card.rank === 'Q') return true;
  return card.suit === ctx.activeSuit || card.rank === ctx.top.rank;
}

export function topCard(state: Pick<PrsiState, 'discardPile'>): Card {
  const top = state.discardPile[state.discardPile.length - 1];
  if (!top) throw new Error('Discard pile is empty');
  return top;
}

export function currentPlayerId(state: PrsiState): string {
  return state.players[state.currentIndex]!.id;
}

export interface LegalMoves {
  playable: string[];
  canDraw: boolean;
  canPass: boolean;
}

export function legalMoves(state: PrsiState, playerId: string): LegalMoves {
  const none: LegalMoves = { playable: [], canDraw: false, canPass: false };
  if (state.phase !== 'playing' || currentPlayerId(state) !== playerId) return none;
  const hand = state.players[state.currentIndex]!.hand;
  const ctx: PlayContext = { top: topCard(state), activeSuit: state.activeSuit, pendingDraw: state.pendingDraw };
  if (state.drawnCardId) {
    const drawn = hand.find((c) => c.id === state.drawnCardId);
    return { playable: drawn && isPlayable(drawn, ctx) ? [drawn.id] : [], canDraw: false, canPass: true };
  }
  return { playable: hand.filter((c) => isPlayable(c, ctx)).map((c) => c.id), canDraw: true, canPass: false };
}

/**
 * Start a round.
 * Dealing goes one card at a time, starting with the starting player.
 * Opening card rule: special cards (7, Q, A) are moved to the bottom of the draw
 * pile until a plain card is on top, so the first discard never carries an effect.
 */
export function createRound(playerIds: string[], startingIndex: number, rng: Rng): { state: PrsiState; events: PrsiEvent[] } {
  if (playerIds.length < PRSI_MIN_PLAYERS || playerIds.length > PRSI_MAX_PLAYERS) {
    throw new Error(`Prší needs ${PRSI_MIN_PLAYERS}–${PRSI_MAX_PLAYERS} players`);
  }
  const n = playerIds.length;
  const start = ((startingIndex % n) + n) % n;
  const drawPile = shuffle(createDeck32(), rng);
  const hands: Record<string, Card[]> = Object.fromEntries(playerIds.map((id) => [id, [] as Card[]]));
  const dealOrder: string[] = [];
  for (let round = 0; round < PRSI_HAND_SIZE; round++) {
    for (let k = 0; k < n; k++) {
      const id = playerIds[(start + k) % n]!;
      hands[id]!.push(drawPile.pop()!);
      dealOrder.push(id);
    }
  }
  while (isSpecial(drawPile[drawPile.length - 1]!)) {
    drawPile.unshift(drawPile.pop()!);
  }
  const startCard = drawPile.pop()!;
  const state: PrsiState = {
    players: playerIds.map((id) => ({ id, hand: hands[id]! })),
    drawPile,
    discardPile: [startCard],
    activeSuit: startCard.suit,
    currentIndex: start,
    pendingDraw: 0,
    drawnCardId: null,
    phase: 'playing',
    winnerId: null,
  };
  const startingPlayerId = playerIds[start]!;
  return {
    state,
    events: [
      { type: 'roundStarted', dealOrder, hands: structuredClone(hands), startCard, startingPlayerId },
      { type: 'turnChanged', playerId: startingPlayerId },
    ],
  };
}

export function applyAction(prev: PrsiState, playerId: string, action: PrsiAction, rng: Rng): ApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'finished' };
  if (currentPlayerId(prev) !== playerId) return { ok: false, error: 'not-your-turn' };
  const state = structuredClone(prev);
  const events: PrsiEvent[] = [];
  switch (action.type) {
    case 'play': {
      const error = play(state, action.cardId, action.chosenSuit, events);
      return error ? { ok: false, error } : { ok: true, state, events };
    }
    case 'draw': {
      if (state.drawnCardId) return { ok: false, error: 'already-drew' };
      draw(state, rng, events);
      return { ok: true, state, events };
    }
    case 'pass': {
      if (!state.drawnCardId) return { ok: false, error: 'cannot-pass' };
      state.drawnCardId = null;
      events.push({ type: 'passed', playerId });
      advance(state, 1, events);
      return { ok: true, state, events };
    }
    default:
      return { ok: false, error: 'unknown-action' };
  }
}

function play(state: PrsiState, cardId: string, chosenSuit: Suit | undefined, events: PrsiEvent[]): PrsiError | null {
  const player = state.players[state.currentIndex]!;
  const index = player.hand.findIndex((c) => c.id === cardId);
  if (index < 0) return 'card-not-in-hand';
  if (state.drawnCardId && state.drawnCardId !== cardId) return 'must-play-drawn-card';
  const card = player.hand[index]!;
  if (!isPlayable(card, { top: topCard(state), activeSuit: state.activeSuit, pendingDraw: state.pendingDraw })) {
    return 'card-not-playable';
  }
  if (card.rank === 'Q' && !isSuit(chosenSuit)) return 'suit-required';

  player.hand.splice(index, 1);
  state.discardPile.push(card);
  state.drawnCardId = null;
  events.push({ type: 'cardPlayed', playerId: player.id, card });

  if (player.hand.length === 0) {
    state.phase = 'finished';
    state.winnerId = player.id;
    state.activeSuit = card.rank === 'Q' ? chosenSuit! : card.suit;
    state.pendingDraw = 0;
    events.push({ type: 'roundWon', playerId: player.id });
    return null;
  }

  if (card.rank === 'Q') {
    state.activeSuit = chosenSuit!;
    events.push({ type: 'suitChanged', playerId: player.id, suit: chosenSuit! });
  } else {
    state.activeSuit = card.suit;
  }

  if (card.rank === '7') {
    state.pendingDraw += 2;
    events.push({ type: 'drawPenalty', targetPlayerId: peek(state, 1), total: state.pendingDraw });
    advance(state, 1, events);
  } else if (card.rank === 'A') {
    events.push({ type: 'turnSkipped', playerId: peek(state, 1), byPlayerId: player.id });
    advance(state, 2, events);
  } else {
    advance(state, 1, events);
  }
  return null;
}

function draw(state: PrsiState, rng: Rng, events: PrsiEvent[]): void {
  if (state.pendingDraw > 0) {
    drawCards(state, state.currentIndex, state.pendingDraw, 'penalty', rng, events);
    state.pendingDraw = 0;
    advance(state, 1, events);
    return;
  }
  const drawn = drawCards(state, state.currentIndex, 1, 'normal', rng, events);
  const card = drawn[0];
  if (card && isPlayable(card, { top: topCard(state), activeSuit: state.activeSuit, pendingDraw: 0 })) {
    // Player may play the drawn card right away, or pass.
    state.drawnCardId = card.id;
    return;
  }
  advance(state, 1, events);
}

/**
 * Draws up to `count` cards. When the draw pile runs out, every discard except the
 * top card is shuffled back in. If both piles are exhausted the player simply gets fewer cards.
 */
function drawCards(
  state: PrsiState,
  playerIndex: number,
  count: number,
  reason: DrawReason,
  rng: Rng,
  events: PrsiEvent[],
): Card[] {
  const player = state.players[playerIndex]!;
  const all: Card[] = [];
  let chunk: Card[] = [];
  const flush = () => {
    if (chunk.length) events.push({ type: 'cardsDrawn', playerId: player.id, cards: chunk, reason });
    chunk = [];
  };
  while (all.length < count) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length <= 1) break;
      flush();
      const top = state.discardPile.pop()!;
      state.drawPile = shuffle(state.discardPile, rng);
      state.discardPile = [top];
      events.push({ type: 'deckReshuffled', count: state.drawPile.length });
    }
    const card = state.drawPile.pop()!;
    player.hand.push(card);
    chunk.push(card);
    all.push(card);
  }
  flush();
  if (all.length === 0) events.push({ type: 'cardsDrawn', playerId: player.id, cards: [], reason });
  return all;
}

function peek(state: PrsiState, steps: number): string {
  return state.players[(state.currentIndex + steps) % state.players.length]!.id;
}

function advance(state: PrsiState, steps: number, events: PrsiEvent[]): void {
  state.currentIndex = (state.currentIndex + steps) % state.players.length;
  events.push({ type: 'turnChanged', playerId: currentPlayerId(state) });
}

/**
 * Removes a player who left mid-round. Their cards go under the draw pile.
 * If only one player remains, that player wins.
 */
export function removePlayer(prev: PrsiState, playerId: string, rng: Rng): { state: PrsiState; events: PrsiEvent[] } {
  const index = prev.players.findIndex((p) => p.id === playerId);
  if (index < 0 || prev.phase !== 'playing') return { state: prev, events: [] };
  const state = structuredClone(prev);
  const events: PrsiEvent[] = [];
  const [removed] = state.players.splice(index, 1);
  state.drawPile = [...shuffle(removed!.hand, rng), ...state.drawPile];
  events.push({ type: 'playerRemoved', playerId });

  if (state.players.length === 1) {
    state.phase = 'finished';
    state.winnerId = state.players[0]!.id;
    state.currentIndex = 0;
    state.pendingDraw = 0;
    state.drawnCardId = null;
    events.push({ type: 'roundWon', playerId: state.winnerId });
    return { state, events };
  }
  if (index < state.currentIndex) {
    state.currentIndex -= 1;
  } else if (index === state.currentIndex) {
    // The leaver's turn passes to whoever sat after them; a pending 7-penalty carries over.
    state.currentIndex = index % state.players.length;
    state.drawnCardId = null;
    events.push({ type: 'turnChanged', playerId: currentPlayerId(state) });
  }
  return { state, events };
}
