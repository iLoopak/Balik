import { createDeck32, shuffle, type Card, type Rng } from '../cards';
import type { PetrAction, PetrEvent, PetrResult, PetrState } from './types';

/** The black jack is Černý Petr; the other three jacks leave the deck. */
export const PETR_CARD_ID = 'spades-J';
export const isPetr = (state: object): state is PetrState => 'kind' in state && state.kind === 'petr';
export const petrDeck = () => createDeck32().filter((c) => c.rank !== 'J' || c.id === PETR_CARD_ID);

/** Removes every pair of equal rank from a hand and returns the pairs. */
export function takePairs(hand: Card[]): Card[][] {
  const pairs: Card[][] = [];
  const byRank = new Map<string, Card[]>();
  for (const c of hand) byRank.set(c.rank, [...(byRank.get(c.rank) ?? []), c]);
  for (const cards of byRank.values()) for (let i = 0; i + 1 < cards.length; i += 2) pairs.push([cards[i]!, cards[i + 1]!]);
  const gone = new Set(pairs.flat().map((c) => c.id));
  hand.splice(0, hand.length, ...hand.filter((c) => !gone.has(c.id)));
  return pairs;
}
const nextActive = (s: PetrState, from: number) => {
  for (let k = 1; k <= s.players.length; k++) { const i = (from + k) % s.players.length; if (!s.players[i]!.out) return i; }
  return from;
};
export const petrTarget = (s: PetrState) => nextActive(s, s.currentIndex);

export function createPetrRound(ids: string[], startingIndex: number, rng: Rng): { state: PetrState; events: PetrEvent[] } {
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length) throw new Error('Černý Petr requires 2–4 unique players');
  const start = ((startingIndex % ids.length) + ids.length) % ids.length;
  const deck = shuffle(petrDeck(), rng);
  const players = ids.map((id) => ({ id, hand: [] as Card[], out: false }));
  const dealOrder: string[] = [];
  for (let i = 0; deck.length; i++) { const p = players[(start + i) % ids.length]!; p.hand.push(deck.pop()!); dealOrder.push(p.id); }
  const hands = Object.fromEntries(players.map((p) => [p.id, structuredClone(p.hand)]));
  const pairs = players.flatMap((p) => takePairs(p.hand).map((cards) => ({ playerId: p.id, cards })));
  const state: PetrState = { kind: 'petr', players, pairs, currentIndex: start, finishOrder: [], phase: 'playing', winnerId: null, result: null };
  const events: PetrEvent[] = [{ type: 'petrStarted', dealOrder, hands, pairs: structuredClone(pairs) }];
  settle(state, events);
  if (state.phase === 'playing') {
    if (state.players[state.currentIndex]!.out) state.currentIndex = nextActive(state, state.currentIndex);
    events.push({ type: 'petrTurn', playerId: state.players[state.currentIndex]!.id, targetId: state.players[petrTarget(state)]!.id });
  }
  return { state, events };
}

/** Players without cards leave; with one player left the game is over. */
function settle(s: PetrState, events: PetrEvent[]) {
  for (const p of s.players) if (!p.out && !p.hand.length) { p.out = true; s.finishOrder.push(p.id); events.push({ type: 'petrOut', playerId: p.id }); }
  const left = s.players.filter((p) => !p.out);
  if (left.length > 1) return;
  const loser = left[0]?.id ?? null;
  s.phase = 'finished';
  const result: PetrResult = { winnerIds: s.players.filter((p) => p.id !== loser).map((p) => p.id), loserId: loser, finishOrder: [...s.finishOrder], reason: 'petr' };
  s.result = result; s.winnerId = s.finishOrder[0] ?? null;
  events.push({ type: 'petrEnded', result: structuredClone(result) });
}

export type PetrApplyResult = { ok: true; state: PetrState; events: PetrEvent[] } | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
export function applyPetrAction(prev: PetrState, playerId: string, action: PetrAction | { type: string }, rng: Rng): PetrApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== playerId) return { ok: false, error: 'not-your-turn' };
  const target = prev.players[petrTarget(prev)]!;
  if (action.type !== 'petrDraw' || !('index' in action) || !Number.isInteger(action.index) || action.index < 0 || action.index >= target.hand.length) return { ok: false, error: 'illegal-action' };
  const s = structuredClone(prev); const events: PetrEvent[] = [];
  const me = s.players[s.currentIndex]!, from = s.players[petrTarget(s)]!;
  // The hand is shuffled before the pick, so a position never reveals a card.
  from.hand = shuffle(from.hand, rng);
  const card = from.hand.splice(action.index, 1)[0]!;
  me.hand.push(card);
  const twin = me.hand.find((c) => c.id !== card.id && c.rank === card.rank);
  let pair: Card[] | null = null;
  if (twin) { me.hand = me.hand.filter((c) => c !== twin && c !== card); pair = [twin, card]; s.pairs.push({ playerId: me.id, cards: structuredClone(pair) }); }
  events.push({ type: 'petrDrew', playerId: me.id, fromId: from.id, index: action.index, card: { ...card }, pair: pair ? structuredClone(pair) : null });
  settle(s, events);
  if (s.phase === 'playing') {
    s.currentIndex = nextActive(s, s.currentIndex);
    events.push({ type: 'petrTurn', playerId: s.players[s.currentIndex]!.id, targetId: s.players[petrTarget(s)]!.id });
  }
  return { ok: true, state: s, events };
}

export function removePetrPlayer(prev: PetrState, playerId: string): { state: PetrState; events: PetrEvent[] } {
  if (prev.phase !== 'playing' || !prev.players.some((p) => p.id === playerId)) return { state: prev, events: [] };
  const s = structuredClone(prev);
  s.phase = 'finished';
  const result: PetrResult = { winnerIds: s.players.filter((p) => p.id !== playerId).map((p) => p.id), loserId: playerId, finishOrder: [...s.finishOrder], reason: 'forfeit' };
  s.result = result; s.winnerId = result.winnerIds[0] ?? null;
  return { state: s, events: [{ type: 'petrEnded', result: structuredClone(result) }] };
}
