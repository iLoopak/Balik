import { sedmaTrickWinner } from './engine';
import type { SedmaAction, SedmaClientEvent, SedmaEvent, SedmaState, SedmaView } from './types';
export function sedmaViewFor(state: SedmaState, id: string): SedmaView {
  return {
    players: state.players.map((p) => ({ id: p.id, team: p.team, handCount: p.hand.length })),
    myHand: structuredClone(state.players.find((p) => p.id === id)?.hand ?? null), drawCount: state.drawPile.length,
    scores: [...state.scores], capturedCounts: [state.captured[0].length, state.captured[1].length],
    trick: structuredClone(state.trick), leadRank: state.leadRank, leaderId: state.players[state.leaderIndex]!.id,
    currentPlayerId: state.players[state.currentIndex]!.id, deciding: state.deciding,
    lastTrick: structuredClone(state.lastTrick), lastTrickBonus: state.lastTrickBonus,
    phase: state.phase, winnerId: state.winnerId, result: structuredClone(state.result),
  };
}
export function filterSedmaEventFor(event: SedmaEvent, id: string): SedmaClientEvent {
  if (event.type === 'sedmaStarted') return { type: event.type, dealOrder: [...event.dealOrder], myCards: structuredClone(event.hands[id] ?? []), startingPlayerId: event.startingPlayerId };
  if (event.type === 'sedmaDrawn') return { type: event.type, playerId: event.playerId, count: event.cards.length, ...(event.playerId === id ? { cards: structuredClone(event.cards) } : {}) };
  return structuredClone(event);
}
export function sedmaLegalFromView(view: SedmaView, id: string): SedmaAction[] {
  if (view.phase !== 'playing' || view.currentPlayerId !== id) return [];
  return [ ...(view.myHand ?? []).filter((c) => !view.deciding || c.rank === '7' || c.rank === view.leadRank).map((c) => ({ type: 'play' as const, cardId: c.id })), ...(view.deciding ? [{ type: 'collect' as const }] : []) ];
}
/** Uses only the same information a human at this seat sees. */
export function chooseSedmaBotFromView(view: SedmaView, id: string): SedmaAction {
  const actions = sedmaLegalFromView(view, id); const plays = actions.filter((a) => a.type === 'play');
  const team = view.players.find((p) => p.id === id)?.team;
  const winning = view.trick.length ? view.players.find((p) => p.id === sedmaTrickWinner(view.trick))?.team === team : false;
  if (view.deciding && (winning || !plays.length)) return { type: 'collect' };
  const cards = [...(view.myHand ?? [])].filter((c) => plays.some((p) => p.cardId === c.id));
  // Preserve sevens, feed a winning partner; take valuable tricks when possible.
  const value = (rank: string) => rank === 'A' || rank === '10' ? 10 : rank === '7' ? 5 : 0;
  cards.sort((a, b) => value(a.rank) - value(b.rank));
  const points = view.trick.some((p) => p.card.rank === 'A' || p.card.rank === '10');
  const take = cards.find((c) => c.rank === view.leadRank || c.rank === '7');
  const chosen = !winning && points && take ? take : cards[0];
  if (!chosen) { if (view.deciding) return { type: 'collect' }; throw new Error('No legal bot action'); }
  return { type: 'play', cardId: chosen.id };
}
