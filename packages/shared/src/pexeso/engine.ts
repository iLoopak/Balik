import { createDeck32, shuffle, type Card, type Rng } from '../cards';
import type { PexesoAction, PexesoEvent, PexesoResult, PexesoState } from './types';

export const isPexeso = (state: object): state is PexesoState => 'kind' in state && state.kind === 'pexeso';
const red = (c: Card) => c.suit === 'hearts' || c.suit === 'diamonds';
/** A pair is the same rank in the same colour: red (hearts, diamonds) or black (clubs, spades). */
export const pexesoPair = (a: Card, b: Card) => a.id !== b.id && a.rank === b.rank && red(a) === red(b);

export function createPexesoRound(ids: string[], startingIndex: number, rng: Rng): { state: PexesoState; events: PexesoEvent[] } {
  if (ids.length < 1 || ids.length > 4 || new Set(ids).size !== ids.length) throw new Error('Pexeso requires 1–4 unique players');
  const start = ((startingIndex % ids.length) + ids.length) % ids.length;
  const state: PexesoState = { kind: 'pexeso', players: ids.map((id) => ({ id, pairs: 0 })), board: shuffle(createDeck32(), rng), flipped: [],
    currentIndex: start, turns: 0, seen: [], phase: 'playing', winnerId: null, result: null };
  return { state, events: [{ type: 'pexesoStarted', count: 32, startingPlayerId: ids[start]! }, { type: 'pexesoTurn', playerId: ids[start]! }] };
}

export function pexesoLegal(view: { phase: string; board: ({ state: string } | Card | null)[] }, flipped: readonly number[], myTurn: boolean): PexesoAction[] {
  if (view.phase !== 'playing' || !myTurn) return [];
  return view.board.flatMap((slot, index) => {
    const down = slot && ('state' in slot ? slot.state === 'down' : true);
    return down && !flipped.includes(index) ? [{ type: 'pexesoFlip' as const, index }] : [];
  });
}

export type PexesoApplyResult = { ok: true; state: PexesoState; events: PexesoEvent[] } | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
export function applyPexesoAction(prev: PexesoState, playerId: string, action: PexesoAction | { type: string }): PexesoApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== playerId) return { ok: false, error: 'not-your-turn' };
  if (action.type !== 'pexesoFlip' || !('index' in action)) return { ok: false, error: 'illegal-action' };
  const index = action.index;
  if (!Number.isInteger(index) || !prev.board[index] || prev.flipped.includes(index)) return { ok: false, error: 'illegal-action' };
  const s = structuredClone(prev); const events: PexesoEvent[] = [];
  const card = s.board[index]!;
  s.flipped.push(index);
  s.seen = [...s.seen, { index, card: { ...card }, turn: s.turns }].slice(-24);
  events.push({ type: 'pexesoFlipped', playerId, index, card: { ...card } });
  if (s.flipped.length < 2) return { ok: true, state: s, events };
  const [a, b] = s.flipped as [number, number];
  s.flipped = []; s.turns++;
  if (pexesoPair(s.board[a]!, s.board[b]!)) {
    const cards = [s.board[a]!, s.board[b]!];
    s.board[a] = null; s.board[b] = null;
    s.players[s.currentIndex]!.pairs++;
    events.push({ type: 'pexesoMatch', playerId, indices: [a, b], cards: structuredClone(cards) });
    if (s.board.every((c) => !c)) {
      const top = Math.max(...s.players.map((p) => p.pairs));
      const result: PexesoResult = { winnerIds: s.players.filter((p) => p.pairs === top).map((p) => p.id), pairs: Object.fromEntries(s.players.map((p) => [p.id, p.pairs])), turns: s.turns, reason: 'pairs' };
      s.phase = 'finished'; s.result = result; s.winnerId = result.winnerIds[0] ?? null;
      events.push({ type: 'pexesoEnded', result: structuredClone(result) });
      return { ok: true, state: s, events };
    }
    // A found pair keeps the turn.
    events.push({ type: 'pexesoTurn', playerId });
    return { ok: true, state: s, events };
  }
  events.push({ type: 'pexesoMiss', playerId, indices: [a, b] });
  s.currentIndex = (s.currentIndex + 1) % s.players.length;
  events.push({ type: 'pexesoTurn', playerId: s.players[s.currentIndex]!.id });
  return { ok: true, state: s, events };
}

export function removePexesoPlayer(prev: PexesoState, playerId: string): { state: PexesoState; events: PexesoEvent[] } {
  if (prev.phase !== 'playing' || !prev.players.some((p) => p.id === playerId)) return { state: prev, events: [] };
  const s = structuredClone(prev);
  const rest = s.players.filter((p) => p.id !== playerId);
  const top = Math.max(0, ...rest.map((p) => p.pairs));
  const result: PexesoResult = { winnerIds: rest.filter((p) => p.pairs === top).map((p) => p.id), pairs: Object.fromEntries(s.players.map((p) => [p.id, p.pairs])), turns: s.turns, reason: 'forfeit' };
  s.phase = 'finished'; s.result = result; s.winnerId = result.winnerIds[0] ?? null;
  return { state: s, events: [{ type: 'pexesoEnded', result: structuredClone(result) }] };
}
