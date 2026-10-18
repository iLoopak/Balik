import { okoLegal, okoTotal } from './engine';
import type { OkoAction, OkoClientEvent, OkoEvent, OkoState, OkoView } from './types';

export function okoViewFor(state: OkoState, id: string): OkoView {
  const me = state.players.find((p) => p.id === id);
  return {
    players: state.players.map((p) => ({ id: p.id, handCount: p.hand.length, score: p.score, status: p.status,
      revealed: p.status === 'bust' || p.status === 'oko' ? structuredClone(p.hand) : null })),
    myHand: structuredClone(me?.hand ?? null), myTotal: me ? okoTotal(me.hand) : null,
    bankId: state.players[state.bankIndex]!.id, hand: state.hand, hands: state.hands, deckCount: state.deck.length,
    currentPlayerId: state.players[state.currentIndex]!.id, lastHand: structuredClone(state.lastHand),
    phase: state.phase, winnerId: state.winnerId, result: structuredClone(state.result),
  };
}
export function filterOkoEventFor(event: OkoEvent, id: string): OkoClientEvent {
  if (event.type === 'okoHand') return { type: event.type, hand: event.hand, bankId: event.bankId, dealOrder: [...event.dealOrder], myCards: structuredClone(event.cards[id] ?? []) };
  if (event.type === 'okoDrew') return { type: event.type, playerId: event.playerId, status: event.status, revealed: structuredClone(event.revealed), ...(event.playerId === id ? { card: { ...event.card } } : {}) };
  return structuredClone(event);
}
export function okoLegalFromView(view: OkoView, id: string): OkoAction[] {
  return okoLegal(view, view.currentPlayerId === id);
}
/** Players draw below 15, the bank below 17; nothing else is known about the others. */
export function chooseOkoBotFromView(view: OkoView, id: string): OkoAction {
  const total = view.myTotal ?? 0;
  return total < (view.bankId === id ? 17 : 15) ? { type: 'okoHit' } : { type: 'okoStand' };
}
