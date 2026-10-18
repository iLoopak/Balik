import type { Card } from '../cards';
import { durakLegal, durakRole } from './engine';
import type { DurakAction, DurakClientEvent, DurakEvent, DurakState, DurakView } from './types';
import { RANKS } from '../cards';

export function durakViewFor(state: DurakState, id: string): DurakView {
  return {
    players: state.players.map((p) => ({ id: p.id, handCount: p.hand.length, out: p.out })),
    myHand: structuredClone(state.players.find((p) => p.id === id)?.hand ?? null),
    talonCount: state.talon.length, trumpCard: { ...state.trumpCard }, trump: state.trump, table: structuredClone(state.table),
    attackerId: state.players[state.attackerIndex]!.id, defenderId: state.players[state.defenderIndex]!.id,
    currentPlayerId: state.players[state.currentIndex]!.id, role: durakRole(state), limit: state.limit,
    discardCount: state.discardCount, finishOrder: [...state.finishOrder], phase: state.phase, winnerId: state.winnerId, result: structuredClone(state.result),
  };
}
export function filterDurakEventFor(event: DurakEvent, id: string): DurakClientEvent {
  if (event.type === 'durakStarted') return { type: event.type, dealOrder: [...event.dealOrder], myCards: structuredClone(event.hands[id] ?? []), trumpCard: { ...event.trumpCard }, attackerId: event.attackerId, defenderId: event.defenderId };
  if (event.type === 'durakDrawn') return { type: event.type, playerId: event.playerId, count: event.cards.length, trumpDrawn: event.trumpDrawn, ...(event.playerId === id ? { cards: structuredClone(event.cards) } : {}) };
  return structuredClone(event);
}
export function durakLegalFromView(view: DurakView, id: string): DurakAction[] {
  return durakLegal(view, view.myHand ?? [], view.currentPlayerId === id);
}
/** Cheapest card wins: non-trumps before trumps, low before high; trumps are saved early on. */
export function chooseDurakBotFromView(view: DurakView, id: string): DurakAction {
  const legal = durakLegalFromView(view, id);
  const hand = view.myHand ?? [];
  const cost = (c: Card) => RANKS.indexOf(c.rank) + (c.suit === view.trump ? 10 : 0);
  const cards = (type: string) => legal.flatMap((a) => a.type === type && 'cardId' in a ? [hand.find((c) => c.id === a.cardId)!] : []).sort((a, b) => cost(a) - cost(b));
  if (view.role === 'defend') {
    const options = cards('durakDefend');
    const attack = view.table.find((p) => !p.defense)!.attack;
    const best = options[0];
    // Early in the game, do not spend a trump on a cheap card.
    if (!best || (best.suit === view.trump && attack.suit !== view.trump && RANKS.indexOf(attack.rank) < 3 && view.talonCount > 8)) return { type: 'durakTake' };
    return { type: 'durakDefend', cardId: best.id };
  }
  const attacks = cards('durakAttack');
  const lead = attacks[0];
  if (lead && (!view.table.length || lead.suit !== view.trump || view.talonCount === 0)) return { type: 'durakAttack', cardId: lead.id };
  return legal.find((a) => a.type === 'durakPass') ?? { type: 'durakAttack', cardId: attacks[0]!.id };
}
