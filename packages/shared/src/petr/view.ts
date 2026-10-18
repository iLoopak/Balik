import type { Rng } from '../cards';
import { petrTarget } from './engine';
import type { PetrAction, PetrClientEvent, PetrEvent, PetrState, PetrView } from './types';

export function petrViewFor(state: PetrState, id: string): PetrView {
  return {
    players: state.players.map((p) => ({ id: p.id, handCount: p.hand.length, out: p.out })),
    myHand: structuredClone(state.players.find((p) => p.id === id)?.hand ?? null),
    pairs: structuredClone(state.pairs), currentPlayerId: state.players[state.currentIndex]!.id, targetId: state.players[petrTarget(state)]!.id,
    finishOrder: [...state.finishOrder], phase: state.phase, winnerId: state.winnerId, result: structuredClone(state.result),
  };
}
export function filterPetrEventFor(event: PetrEvent, id: string): PetrClientEvent {
  if (event.type === 'petrStarted') return { type: event.type, dealOrder: [...event.dealOrder], myCards: structuredClone(event.hands[id] ?? []), pairs: structuredClone(event.pairs) };
  // Only the two hands involved learn which card moved; a pair laid down is public.
  if (event.type === 'petrDrew') return { type: event.type, playerId: event.playerId, fromId: event.fromId, index: event.index, pair: structuredClone(event.pair), ...(id === event.playerId || id === event.fromId ? { card: { ...event.card } } : {}) };
  return structuredClone(event);
}
export function petrLegalFromView(view: PetrView, id: string): PetrAction[] {
  if (view.phase !== 'playing' || view.currentPlayerId !== id) return [];
  const count = view.players.find((p) => p.id === view.targetId)?.handCount ?? 0;
  return Array.from({ length: count }, (_, index) => ({ type: 'petrDraw' as const, index }));
}
/** There is nothing to know about face-down cards: bots pick at random. */
export function choosePetrBotFromView(view: PetrView, id: string, rng: Rng): PetrAction {
  const legal = petrLegalFromView(view, id);
  return legal[Math.floor(rng() * legal.length)]!;
}
