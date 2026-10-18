import type { Card } from '../cards';
import { trickWinner } from '../tricks';
import { SNAPS_ORDER, snapsCardPoints, snapsLegal, snapsMarriagePartner, snapsStrict } from './engine';
import type { SnapsAction, SnapsClientEvent, SnapsEvent, SnapsState, SnapsView } from './types';

export function snapsViewFor(state: SnapsState, id: string): SnapsView {
  return {
    players: state.players.map((p) => ({ id: p.id, handCount: p.hand.length, points: p.points, tricks: p.tricks, pending: p.pending })),
    myHand: structuredClone(state.players.find((p) => p.id === id)?.hand ?? null),
    talonCount: state.talon.length, trumpCard: state.trumpCard ? { ...state.trumpCard } : null, trump: state.trump,
    closedBy: state.closedBy, strict: snapsStrict(state), trick: structuredClone(state.trick),
    leaderId: state.players[state.leaderIndex]!.id, currentPlayerId: state.players[state.currentIndex]!.id,
    marriages: structuredClone(state.marriages), phase: state.phase, result: structuredClone(state.result),
  };
}
export function filterSnapsEventFor(event: SnapsEvent, id: string): SnapsClientEvent {
  if (event.type === 'snapsStarted') return { type: event.type, dealOrder: [...event.dealOrder], myCards: structuredClone(event.hands[id] ?? []), trumpCard: { ...event.trumpCard }, startingPlayerId: event.startingPlayerId };
  // The face-up trump card is public; other draws are only visible to the drawer.
  if (event.type === 'snapsDrawn') return { type: event.type, playerId: event.playerId, fromTrump: event.fromTrump, ...(event.playerId === id || event.fromTrump ? { card: { ...event.card } } : {}) };
  return structuredClone(event);
}
export function snapsLegalFromView(view: SnapsView, id: string): SnapsAction[] {
  return snapsLegal(view, view.myHand ?? [], view.currentPlayerId === id);
}
/** Plays only from what the seat sees: exchanges and marriages first, cheap wins, low leads. */
export function chooseSnapsBotFromView(view: SnapsView, id: string): SnapsAction {
  const legal = snapsLegalFromView(view, id);
  if (legal.some((a) => a.type === 'snapsExchange')) return { type: 'snapsExchange' };
  const hand = view.myHand ?? [];
  const plays = legal.filter((a): a is Extract<SnapsAction, { type: 'snapsPlay' }> => a.type === 'snapsPlay');
  const cardOf = (a: { cardId: string }) => hand.find((c) => c.id === a.cardId)!;
  const value = (c: Card) => snapsCardPoints(c) + (c.suit === view.trump ? 12 : 0);
  if (!view.trick.length) {
    const marriage = plays.find((a) => a.marriage && cardOf(a).rank === 'Q');
    if (marriage) return marriage;
    // Lead the cheapest non-trump, keeping marriage partners at home.
    const sorted = [...plays].sort((a, b) => value(cardOf(a)) - value(cardOf(b)) + (snapsMarriagePartner(hand, cardOf(a)) ? 20 : 0) - (snapsMarriagePartner(hand, cardOf(b)) ? 20 : 0));
    return { type: 'snapsPlay', cardId: sorted[0]!.cardId };
  }
  const led = view.trick[0]!;
  const winning = plays.filter((a) => trickWinner([led, { playerId: id, card: cardOf(a) }], view.trump, SNAPS_ORDER).playerId === id);
  const worth = snapsCardPoints(led.card);
  if (winning.length && (worth >= 10 || view.strict)) {
    winning.sort((a, b) => value(cardOf(a)) - value(cardOf(b)));
    return { type: 'snapsPlay', cardId: winning[0]!.cardId };
  }
  const cheapest = [...plays].sort((a, b) => value(cardOf(a)) - value(cardOf(b)))[0]!;
  return { type: 'snapsPlay', cardId: cheapest.cardId };
}
