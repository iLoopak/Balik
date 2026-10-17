import { createDeck32, shuffle, type Card, type Rng } from '../cards';
import type { SedmaAction, SedmaEvent, SedmaResult, SedmaState, TeamId, TrickCard } from './types';
export const sedmaPoints = (card: Card) => card.rank === 'A' || card.rank === '10' ? 10 : 0;
export const isSedma = (state: object): state is SedmaState => 'kind' in state && state.kind === 'sedma';
export function sedmaTrickWinner(cards: TrickCard[]): string {
  if (!cards.length) throw new Error('Empty trick');
  const rank = cards[0]!.card.rank;
  return cards.filter((p) => p.card.rank === rank || p.card.rank === '7').at(-1)!.playerId;
}
export function sedmaResult(state: SedmaState, reason: SedmaResult['reason'] = 'points', forfeitingTeam?: TeamId): SedmaResult {
  const winnerTeam = forfeitingTeam !== undefined ? (1 - forfeitingTeam) as TeamId
    : state.scores[0] === state.scores[1] ? null : state.scores[0] > state.scores[1] ? 0 : 1;
  return { scores: [...state.scores], winnerTeam,
    winnerIds: state.players.filter((p) => p.team === winnerTeam).map((p) => p.id), reason };
}
export function createSedmaRound(ids: string[], startingIndex: number, rng: Rng, lastTrickBonus: 0 | 10 = 10): { state: SedmaState; events: SedmaEvent[] } {
  if ((ids.length !== 2 && ids.length !== 4) || new Set(ids).size !== ids.length) throw new Error('Sedma requires 2 or 4 unique players');
  const start = ((startingIndex % ids.length) + ids.length) % ids.length;
  const state: SedmaState = { kind: 'sedma', players: ids.map((id, i) => ({ id, hand: [], team: (i % 2) as TeamId })),
    drawPile: shuffle(createDeck32(), rng), captured: [[], []], scores: [0, 0], trick: [], leadRank: null,
    leaderIndex: start, currentIndex: start, deciding: false, lastTrick: null, lastTrickBonus,
    phase: 'playing', winnerId: null, result: null };
  const dealOrder: string[] = [];
  for (let round = 0; round < 4; round++) for (let i = 0; i < ids.length; i++) {
    const player = state.players[(start + i) % ids.length]!;
    player.hand.push(state.drawPile.pop()!); dealOrder.push(player.id);
  }
  return { state, events: [{ type: 'sedmaStarted', dealOrder,
    hands: Object.fromEntries(state.players.map((p) => [p.id, p.hand.map((c) => ({ ...c }))])), startingPlayerId: ids[start]! }] };
}
export type SedmaApplyResult = { ok: true; state: SedmaState; events: SedmaEvent[] } | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
export function applySedmaAction(prev: SedmaState, playerId: string, action: SedmaAction | { type: string }, _rng?: Rng): SedmaApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== playerId) return { ok: false, error: 'not-your-turn' };
  const moves = sedmaLegalActions(prev, playerId);
  if (!moves.some((a) => a.type === action.type && (a.type !== 'play' || ('cardId' in action && a.cardId === action.cardId)))) return { ok: false, error: 'illegal-action' };
  const state = structuredClone(prev); const events: SedmaEvent[] = [];
  if (action.type === 'collect') resolve(state, events);
  else {
    const player = state.players[state.currentIndex]!;
    const card = player.hand.splice(player.hand.findIndex((c) => c.id === (action as SedmaAction & { type: 'play' }).cardId), 1)[0]!;
    const continuing = state.deciding;
    state.deciding = false;
    state.trick.push({ playerId, card }); state.leadRank ??= card.rank;
    events.push({ type: 'sedmaPlayed', playerId, card: { ...card }, continuing });
    if (state.trick.length % state.players.length === 0) {
      state.currentIndex = state.leaderIndex; state.deciding = true;
      if (!sedmaLegalActions(state, state.players[state.leaderIndex]!.id).some((a) => a.type === 'play')) resolve(state, events);
    } else state.currentIndex = (state.currentIndex + 1) % state.players.length;
  }
  if (state.phase === 'playing') events.push({ type: 'sedmaTurn', playerId: state.players[state.currentIndex]!.id, deciding: state.deciding });
  return { ok: true, state, events };
}
function resolve(state: SedmaState, events: SedmaEvent[]) {
  const winnerId = sedmaTrickWinner(state.trick);
  const index = state.players.findIndex((p) => p.id === winnerId);
  const team = state.players[index]!.team;
  const last = !state.drawPile.length && state.players.every((p) => !p.hand.length);
  const points = state.trick.reduce((n, p) => n + sedmaPoints(p.card), 0) + (last ? state.lastTrickBonus : 0);
  state.scores[team] += points;
  state.captured[team].push(...state.trick.map((p) => p.card));
  state.lastTrick = { winnerId, team, points, cards: structuredClone(state.trick) };
  events.push({ type: 'trickResolved', ...structuredClone(state.lastTrick), scores: [...state.scores] });
  state.trick = []; state.leadRank = null; state.deciding = false; state.currentIndex = index; state.leaderIndex = index;
  if (last) {
    state.phase = 'finished'; state.result = sedmaResult(state); state.winnerId = state.result.winnerIds[0] ?? null;
    events.push({ type: 'sedmaEnded', result: structuredClone(state.result) }); return;
  }
  // Draw one at a time, starting with the winner, preserving the actual private order.
  for (let round = 0; round < 4 && state.drawPile.length; round++) for (let i = 0; i < state.players.length && state.drawPile.length; i++) {
    const p = state.players[(index + i) % state.players.length]!;
    if (p.hand.length < 4) { const card = state.drawPile.pop()!; p.hand.push(card); events.push({ type: 'sedmaDrawn', playerId: p.id, cards: [{ ...card }] }); }
  }
}
export function sedmaLegalActions(state: SedmaState, id: string): SedmaAction[] {
  if (state.phase !== 'playing' || state.players[state.currentIndex]?.id !== id) return [];
  return [
    ...state.players[state.currentIndex]!.hand.filter((c) => !state.deciding || c.rank === '7' || c.rank === state.leadRank).map((c) => ({ type: 'play' as const, cardId: c.id })),
    ...(state.deciding ? [{ type: 'collect' as const }] : []),
  ];
}
export function removeSedmaPlayer(prev: SedmaState, playerId: string): { state: SedmaState; events: SedmaEvent[] } {
  const player = prev.players.find((p) => p.id === playerId);
  if (!player || prev.phase !== 'playing') return { state: prev, events: [] };
  const state = structuredClone(prev); state.phase = 'finished';
  state.result = sedmaResult(state, 'forfeit', player.team); state.winnerId = state.result.winnerIds[0] ?? null;
  return { state, events: [{ type: 'sedmaEnded', result: structuredClone(state.result) }] };
}
