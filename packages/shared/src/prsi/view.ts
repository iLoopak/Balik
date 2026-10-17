import { isPlayable, topCard, type LegalMoves } from './engine';
import type { PrsiClientEvent, PrsiEvent, PrsiState, PrsiView } from './types';

const DISCARD_VISIBLE = 8;

/** Projects authoritative state to what `viewerId` may see. */
export function viewFor(state: PrsiState, viewerId: string): PrsiView {
  const me = state.players.find((p) => p.id === viewerId);
  const current = state.players[state.currentIndex]!.id;
  return {
    players: state.players.map((p) => ({ id: p.id, handCount: p.hand.length })),
    myHand: me ? me.hand.map((c) => ({ ...c })) : null,
    drawCount: state.drawPile.length,
    discardCount: state.discardPile.length,
    discardTop: state.discardPile.slice(-DISCARD_VISIBLE).map((c) => ({ ...c })),
    activeSuit: state.activeSuit,
    pendingDraw: state.pendingDraw,
    currentPlayerId: current,
    drawnCardId: current === viewerId ? state.drawnCardId : null,
    phase: state.phase,
    winnerId: state.winnerId,
  };
}

/** Strips private card data from an engine event for one viewer. */
export function filterEventFor(event: PrsiEvent, viewerId: string): PrsiClientEvent {
  switch (event.type) {
    case 'roundStarted':
      return {
        type: 'roundStarted',
        dealOrder: event.dealOrder.slice(),
        myCards: (event.hands[viewerId] ?? []).map((c) => ({ ...c })),
        startCard: { ...event.startCard },
        startingPlayerId: event.startingPlayerId,
      };
    case 'cardsDrawn': {
      const base = { type: 'cardsDrawn' as const, playerId: event.playerId, count: event.cards.length, reason: event.reason };
      return event.playerId === viewerId ? { ...base, cards: event.cards.map((c) => ({ ...c })) } : base;
    }
    default:
      return structuredClone(event);
  }
}

/** Same rules as the engine, evaluated on a client view (for highlighting playable cards). */
export function legalMovesFromView(view: PrsiView, viewerId: string): LegalMoves {
  const none: LegalMoves = { playable: [], canDraw: false, canPass: false };
  if (view.phase !== 'playing' || view.currentPlayerId !== viewerId || !view.myHand) return none;
  const ctx = { top: topCard({ discardPile: view.discardTop }), activeSuit: view.activeSuit, pendingDraw: view.pendingDraw };
  if (view.drawnCardId) {
    const drawn = view.myHand.find((c) => c.id === view.drawnCardId);
    return { playable: drawn && isPlayable(drawn, ctx) ? [drawn.id] : [], canDraw: false, canPass: true };
  }
  return { playable: view.myHand.filter((c) => isPlayable(c, ctx)).map((c) => c.id), canDraw: true, canPass: false };
}
