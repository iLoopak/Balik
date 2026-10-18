import { RANKS, createDeck32, shuffle, type Card, type Rng, type Suit } from '../cards';
import type { DurakAction, DurakEvent, DurakPair, DurakResult, DurakState } from './types';

export const isDurak = (state: object): state is DurakState => 'kind' in state && state.kind === 'durak';
const strength = (c: Card) => RANKS.indexOf(c.rank);
/** A defence beats an attack with a higher card of its suit, or any trump over a non-trump. */
export function durakBeats(defense: Card, attack: Card, trump: Suit): boolean {
  if (defense.suit === attack.suit) return strength(defense) > strength(attack);
  return defense.suit === trump && attack.suit !== trump;
}

/** Legal actions from what a seat sees; used by the engine, the UI and the bots. */
export function durakLegal(view: { table: DurakPair[]; trump: Suit; limit: number; role: 'attack' | 'defend'; phase: string }, hand: readonly Card[], myTurn: boolean): DurakAction[] {
  if (view.phase !== 'playing' || !myTurn) return [];
  if (view.role === 'defend') {
    const open = view.table.find((p) => !p.defense);
    if (!open) return [];
    return [...hand.filter((c) => durakBeats(c, open.attack, view.trump)).map((c) => ({ type: 'durakDefend' as const, cardId: c.id })), { type: 'durakTake' }];
  }
  if (view.table.some((p) => !p.defense)) return [];
  const ranks = new Set(view.table.flatMap((p) => [p.attack.rank, p.defense?.rank]));
  const room = view.table.length < view.limit;
  const attacks = room ? hand.filter((c) => !view.table.length || ranks.has(c.rank)).map((c) => ({ type: 'durakAttack' as const, cardId: c.id })) : [];
  return view.table.length ? [...attacks, { type: 'durakPass' }] : attacks;
}

const nextActive = (s: DurakState, from: number) => {
  for (let k = 1; k <= s.players.length; k++) { const i = (from + k) % s.players.length; if (!s.players[i]!.out) return i; }
  return from;
};
const active = (s: DurakState) => s.players.filter((p) => !p.out);

function startBout(s: DurakState, attacker: number, events: DurakEvent[]) {
  s.attackerIndex = attacker; s.defenderIndex = nextActive(s, attacker);
  const order: string[] = [];
  for (let k = 0; k < s.players.length; k++) { const i = (attacker + k) % s.players.length; if (i !== s.defenderIndex && !s.players[i]!.out) order.push(s.players[i]!.id); }
  s.throwers = order; s.throwerPos = 0; s.table = [];
  s.limit = Math.min(6, s.players[s.defenderIndex]!.hand.length);
  s.currentIndex = attacker;
  events.push({ type: 'durakBout', attackerId: s.players[attacker]!.id, defenderId: s.players[s.defenderIndex]!.id, limit: s.limit });
}

export function createDurakRound(ids: string[], startingIndex: number, rng: Rng): { state: DurakState; events: DurakEvent[] } {
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length) throw new Error('Durak requires 2–4 unique players');
  const start = ((startingIndex % ids.length) + ids.length) % ids.length;
  const deck = shuffle(createDeck32(), rng);
  const players = ids.map((id) => ({ id, hand: [] as Card[], out: false }));
  const dealOrder: string[] = [];
  for (let round = 0; round < 6; round++) for (let i = 0; i < ids.length; i++) { const p = players[(start + i) % ids.length]!; p.hand.push(deck.pop()!); dealOrder.push(p.id); }
  const trumpCard = deck[0]!;
  const state: DurakState = { kind: 'durak', players, talon: deck, trumpCard, trump: trumpCard.suit, table: [], attackerIndex: start, defenderIndex: start, throwers: [], throwerPos: 0,
    limit: 6, currentIndex: start, discardCount: 0, finishOrder: [], phase: 'playing', winnerId: null, result: null };
  const events: DurakEvent[] = [];
  startBout(state, start, events);
  return { state, events: [{ type: 'durakStarted', dealOrder, hands: Object.fromEntries(players.map((p) => [p.id, structuredClone(p.hand)])), trumpCard: { ...trumpCard },
    attackerId: state.players[state.attackerIndex]!.id, defenderId: state.players[state.defenderIndex]!.id }, ...events,
    { type: 'durakTurn', playerId: state.players[state.currentIndex]!.id, role: 'attack' }] };
}

const role = (s: DurakState): 'attack' | 'defend' => s.currentIndex === s.defenderIndex && s.table.some((p) => !p.defense) ? 'defend' : 'attack';
const viewish = (s: DurakState) => ({ table: s.table, trump: s.trump, limit: s.limit, role: role(s), phase: s.phase });

export type DurakApplyResult = { ok: true; state: DurakState; events: DurakEvent[] } | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
export function applyDurakAction(prev: DurakState, playerId: string, action: DurakAction | { type: string }): DurakApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== playerId) return { ok: false, error: 'not-your-turn' };
  const legal = durakLegal(viewish(prev), prev.players[prev.currentIndex]!.hand, true);
  const match = legal.find((a) => a.type === action.type && (!('cardId' in a) || ('cardId' in action && a.cardId === action.cardId)));
  if (!match) return { ok: false, error: 'illegal-action' };
  const s = structuredClone(prev); const events: DurakEvent[] = [];
  const me = s.players[s.currentIndex]!;
  const take = (id: string) => me.hand.splice(me.hand.findIndex((c) => c.id === id), 1)[0]!;
  if (match.type === 'durakAttack') {
    const card = take(match.cardId);
    s.table.push({ attack: card, defense: null });
    events.push({ type: 'durakAttacked', playerId, card: { ...card } });
    s.currentIndex = s.defenderIndex;
  } else if (match.type === 'durakDefend') {
    const card = take(match.cardId);
    const index = s.table.findIndex((p) => !p.defense);
    s.table[index]!.defense = card;
    events.push({ type: 'durakDefended', playerId, card: { ...card }, index });
    // Nothing more can be added: the bout is beaten off.
    if (s.table.length >= s.limit || !me.hand.length) return endBout(s, events, false);
    s.currentIndex = s.players.findIndex((p) => p.id === s.throwers[s.throwerPos]);
  } else if (match.type === 'durakTake') {
    return endBout(s, events, true);
  } else {
    events.push({ type: 'durakPassed', playerId });
    // Skip seats that have nothing left to add.
    do s.throwerPos++; while (s.throwerPos < s.throwers.length && !s.players.find((p) => p.id === s.throwers[s.throwerPos])!.hand.length);
    if (s.throwerPos >= s.throwers.length) return endBout(s, events, false);
    s.currentIndex = s.players.findIndex((p) => p.id === s.throwers[s.throwerPos]);
  }
  events.push({ type: 'durakTurn', playerId: s.players[s.currentIndex]!.id, role: role(s) });
  return { ok: true, state: s, events };
}

function endBout(s: DurakState, events: DurakEvent[], took: boolean): DurakApplyResult {
  const defender = s.players[s.defenderIndex]!;
  const cards = s.table.flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])]);
  if (took) { defender.hand.push(...cards); events.push({ type: 'durakTook', playerId: defender.id, cards: structuredClone(cards) }); }
  else { s.discardCount += cards.length; events.push({ type: 'durakBito', count: cards.length }); }
  s.table = [];
  // Refill to six: attackers in order, the defender last.
  for (const id of [...s.throwers, defender.id]) {
    const p = s.players.find((x) => x.id === id)!;
    const drawn: Card[] = [];
    while (p.hand.length + drawn.length < 6 && s.talon.length) drawn.push(s.talon.pop()!);
    if (drawn.length) { p.hand.push(...drawn); events.push({ type: 'durakDrawn', playerId: p.id, cards: structuredClone(drawn), trumpDrawn: drawn.some((c) => c.id === s.trumpCard.id) }); }
  }
  if (!s.talon.length) for (const p of s.players) if (!p.out && !p.hand.length) { p.out = true; s.finishOrder.push(p.id); events.push({ type: 'durakOut', playerId: p.id }); }
  const left = active(s);
  if (left.length <= 1) {
    const loser = left[0]?.id ?? null;
    s.phase = 'finished';
    s.result = { winnerIds: s.players.filter((p) => p.id !== loser).map((p) => p.id), loserId: loser, reason: loser ? 'durak' : 'draw' };
    s.winnerId = s.finishOrder[0] ?? s.result.winnerIds[0] ?? null;
    events.push({ type: 'durakEnded', result: structuredClone(s.result) });
    return { ok: true, state: s, events };
  }
  // After a successful defence the defender attacks; after taking, the seat after the defender.
  const nextAttacker = !took && !defender.out ? s.defenderIndex : nextActive(s, s.defenderIndex);
  startBout(s, nextAttacker, events);
  events.push({ type: 'durakTurn', playerId: s.players[s.currentIndex]!.id, role: 'attack' });
  return { ok: true, state: s, events };
}

export function removeDurakPlayer(prev: DurakState, playerId: string): { state: DurakState; events: DurakEvent[] } {
  if (prev.phase !== 'playing' || !prev.players.some((p) => p.id === playerId)) return { state: prev, events: [] };
  const s = structuredClone(prev);
  s.phase = 'finished';
  const result: DurakResult = { winnerIds: s.players.filter((p) => p.id !== playerId).map((p) => p.id), loserId: playerId, reason: 'forfeit' };
  s.result = result; s.winnerId = result.winnerIds[0] ?? null;
  return { state: s, events: [{ type: 'durakEnded', result: structuredClone(result) }] };
}
export { role as durakRole };
