import { createDeck32, shuffle, type Card, type Rank, type Rng } from '../cards';
import type { OkoAction, OkoEvent, OkoHandResult, OkoResult, OkoState } from './types';

/** Czech Oko bere values: number cards as printed, jacks and queens 1, kings 2, aces 11. */
export const OKO_VALUES: Record<Rank, number> = { '7': 7, '8': 8, '9': 9, '10': 10, J: 1, Q: 1, K: 2, A: 11 };
export const okoTotal = (hand: readonly Card[]) => hand.reduce((n, c) => n + OKO_VALUES[c.rank], 0);
/** Two aces as the whole hand: "oko", which beats everything. */
export const isOko = (hand: readonly Card[]) => hand.length === 2 && hand.every((c) => c.rank === 'A');
export const isOkoState = (state: object): state is OkoState => 'kind' in state && state.kind === 'oko';

/** Seats in playing order for a hand: everyone after the bank, the bank last. */
const order = (s: OkoState) => s.players.map((_, k) => (s.bankIndex + 1 + k) % s.players.length);

function dealHand(s: OkoState, rng: Rng, events: OkoEvent[]) {
  s.deck = shuffle(createDeck32(), rng);
  const cards: Record<string, Card[]> = {};
  const dealOrder: string[] = [];
  for (const i of order(s)) { const p = s.players[i]!; p.hand = [s.deck.pop()!]; p.status = 'waiting'; cards[p.id] = structuredClone(p.hand); dealOrder.push(p.id); }
  s.currentIndex = order(s)[0]!;
  s.players[s.currentIndex]!.status = 'playing';
  events.push({ type: 'okoHand', hand: s.hand, bankId: s.players[s.bankIndex]!.id, dealOrder, cards }, { type: 'okoTurn', playerId: s.players[s.currentIndex]!.id });
}

export function createOkoRound(ids: string[], startingIndex: number, rng: Rng): { state: OkoState; events: OkoEvent[] } {
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length) throw new Error('Oko bere requires 2–4 unique players');
  const start = ((startingIndex % ids.length) + ids.length) % ids.length;
  const state: OkoState = { kind: 'oko', players: ids.map((id) => ({ id, hand: [], score: 0, status: 'waiting' })), deck: [], bankIndex: start,
    hand: 1, hands: Math.max(4, ids.length * 2), currentIndex: start, lastHand: null, phase: 'playing', winnerId: null, result: null };
  const events: OkoEvent[] = [];
  dealHand(state, rng, events);
  return { state, events };
}

export function okoLegal(view: { phase: string }, myTurn: boolean): OkoAction[] {
  return view.phase === 'playing' && myTurn ? [{ type: 'okoHit' }, { type: 'okoStand' }] : [];
}

export type OkoApplyResult = { ok: true; state: OkoState; events: OkoEvent[] } | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
export function applyOkoAction(prev: OkoState, playerId: string, action: OkoAction | { type: string }, rng: Rng): OkoApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== playerId) return { ok: false, error: 'not-your-turn' };
  if (action.type !== 'okoHit' && action.type !== 'okoStand') return { ok: false, error: 'illegal-action' };
  const s = structuredClone(prev); const events: OkoEvent[] = [];
  const me = s.players[s.currentIndex]!;
  if (action.type === 'okoStand') { me.status = 'stood'; events.push({ type: 'okoStood', playerId }); }
  else {
    const card = s.deck.pop()!;
    me.hand.push(card);
    const total = okoTotal(me.hand);
    me.status = isOko(me.hand) ? 'oko' : total > 21 ? 'bust' : total === 21 ? 'stood' : 'playing';
    // A bust or an oko is shown to the table at once.
    events.push({ type: 'okoDrew', playerId, card: { ...card }, status: me.status, revealed: me.status === 'bust' || me.status === 'oko' ? structuredClone(me.hand) : null });
  }
  if (me.status === 'playing') return { ok: true, state: s, events: [...events, { type: 'okoTurn', playerId }] };
  advance(s, rng, events);
  return { ok: true, state: s, events };
}

function advance(s: OkoState, rng: Rng, events: OkoEvent[]) {
  const seats = order(s);
  const pos = seats.indexOf(s.currentIndex);
  const bankIsNext = pos === seats.length - 2;
  // Everybody busted: the bank does not need to play.
  const allBust = s.players.every((p, i) => i === s.bankIndex || p.status === 'bust');
  if (pos < seats.length - 1 && !(bankIsNext && allBust)) {
    s.currentIndex = seats[pos + 1]!;
    s.players[s.currentIndex]!.status = 'playing';
    events.push({ type: 'okoTurn', playerId: s.players[s.currentIndex]!.id });
    return;
  }
  resolveHand(s, events);
  if (s.hand >= s.hands) {
    const top = Math.max(...s.players.map((p) => p.score));
    const result: OkoResult = { winnerIds: s.players.filter((p) => p.score === top).map((p) => p.id), scores: Object.fromEntries(s.players.map((p) => [p.id, p.score])), reason: 'points' };
    s.phase = 'finished'; s.result = result; s.winnerId = result.winnerIds[0] ?? null;
    events.push({ type: 'okoEnded', result: structuredClone(result) });
    return;
  }
  s.hand++; s.bankIndex = (s.bankIndex + 1) % s.players.length;
  dealHand(s, rng, events);
}

function resolveHand(s: OkoState, events: OkoEvent[]) {
  const bank = s.players[s.bankIndex]!;
  const bankTotal = okoTotal(bank.hand), bankOko = isOko(bank.hand), bankBust = !bankOko && bankTotal > 21;
  const outcome: OkoHandResult['outcome'] = {}, points: OkoHandResult['points'] = Object.fromEntries(s.players.map((p) => [p.id, 0]));
  for (const p of s.players) {
    if (p === bank) continue;
    const total = okoTotal(p.hand), oko = isOko(p.hand), bust = !oko && total > 21;
    let win: boolean | null;
    if (bust) win = false;
    else if (oko && bankOko) win = null;
    else if (oko) win = true;
    else if (bankOko) win = false;
    else if (bankBust) win = true;
    else win = total > bankTotal;
    outcome[p.id] = win === null ? 'push' : win ? 'win' : 'lose';
    if (win === true) points[p.id]! += oko ? 2 : 1;
    if (win === false) points[bank.id]! += 1;
  }
  for (const p of s.players) p.score += points[p.id]!;
  s.lastHand = { bankId: bank.id, hands: Object.fromEntries(s.players.map((p) => [p.id, structuredClone(p.hand)])), totals: Object.fromEntries(s.players.map((p) => [p.id, okoTotal(p.hand)])), outcome, points };
  events.push({ type: 'okoResolved', result: structuredClone(s.lastHand), scores: Object.fromEntries(s.players.map((p) => [p.id, p.score])) });
}

export function removeOkoPlayer(prev: OkoState, playerId: string): { state: OkoState; events: OkoEvent[] } {
  if (prev.phase !== 'playing' || !prev.players.some((p) => p.id === playerId)) return { state: prev, events: [] };
  const s = structuredClone(prev);
  const rest = s.players.filter((p) => p.id !== playerId);
  const top = Math.max(...rest.map((p) => p.score));
  const result: OkoResult = { winnerIds: rest.filter((p) => p.score === top).map((p) => p.id), scores: Object.fromEntries(s.players.map((p) => [p.id, p.score])), reason: 'forfeit' };
  s.phase = 'finished'; s.result = result; s.winnerId = result.winnerIds[0] ?? null;
  return { state: s, events: [{ type: 'okoEnded', result: structuredClone(result) }] };
}
