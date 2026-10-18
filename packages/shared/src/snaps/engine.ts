import { createDeck32, shuffle, type Card, type Rank, type Rng, type Suit } from '../cards';
import { legalTrickCards, trickWinner, type RankOrder } from '../tricks';
import type { SnapsAction, SnapsEvent, SnapsResult, SnapsState } from './types';

/** Šnaps / 66 with 24 cards (9–A). */
export const SNAPS_ORDER: RankOrder = ['9', 'J', 'Q', 'K', '10', 'A'];
export const SNAPS_POINTS: Partial<Record<Rank, number>> = { '9': 0, J: 2, Q: 3, K: 4, '10': 10, A: 11 };
export const snapsCardPoints = (card: Card) => SNAPS_POINTS[card.rank] ?? 0;
export const isSnaps = (state: object): state is SnapsState => 'kind' in state && state.kind === 'snaps';
export const snapsDeck = () => createDeck32().filter((c) => c.rank !== '7' && c.rank !== '8');

/** Follow-suit rules apply once the talon is closed or nothing is left to draw. */
export const snapsStrict = (s: { closedBy: string | null; talon?: unknown[]; talonCount?: number; trumpCard: Card | null }) =>
  !!s.closedBy || ((s.talon?.length ?? s.talonCount ?? 0) === 0 && !s.trumpCard);

export function snapsMarriagePartner(hand: readonly Card[], card: Card): Card | undefined {
  if (card.rank !== 'K' && card.rank !== 'Q') return undefined;
  return hand.find((c) => c.suit === card.suit && c.rank === (card.rank === 'K' ? 'Q' : 'K'));
}

export interface SnapsSeat { hand: readonly Card[]; isLeader: boolean; trick: readonly { card: Card }[] }
/** Legal actions computed from what the seat can see; shared by engine, UI and bot. */
export function snapsLegal(view: { trick: { playerId: string; card: Card }[]; trump: Suit; trumpCard: Card | null; closedBy: string | null; talonCount: number; phase: string },
  hand: readonly Card[], myTurn: boolean): SnapsAction[] {
  if (view.phase !== 'playing' || !myTurn) return [];
  const strict = snapsStrict(view);
  const plays = legalTrickCards(hand, view.trick, view.trump, SNAPS_ORDER, strict).map((c): SnapsAction => ({ type: 'snapsPlay', cardId: c.id, marriage: !view.trick.length && !!snapsMarriagePartner(hand, c) }));
  const leading = !view.trick.length;
  const open = !view.closedBy && !!view.trumpCard;
  return [
    ...plays,
    ...(leading && open && view.talonCount >= 2 && hand.some((c) => c.suit === view.trump && c.rank === '9') ? [{ type: 'snapsExchange' as const }] : []),
    ...(leading && open && view.talonCount >= 1 ? [{ type: 'snapsClose' as const }] : []),
  ];
}

export function createSnapsRound(ids: string[], startingIndex: number, rng: Rng): { state: SnapsState; events: SnapsEvent[] } {
  if (ids.length !== 2 || ids[0] === ids[1]) throw new Error('Šnaps requires 2 unique players');
  const start = ((startingIndex % 2) + 2) % 2;
  const deck = shuffle(snapsDeck(), rng);
  const players = ids.map((id) => ({ id, hand: [] as Card[], points: 0, pending: 0, tricks: 0 }));
  const dealOrder: string[] = [];
  for (let round = 0; round < 6; round++) for (let i = 0; i < 2; i++) {
    const p = players[(start + i) % 2]!; p.hand.push(deck.pop()!); dealOrder.push(p.id);
  }
  const trumpCard = deck.pop()!;
  const state: SnapsState = { kind: 'snaps', players, talon: deck, trumpCard, trump: trumpCard.suit, closedBy: null, trick: [],
    leaderIndex: start, currentIndex: start, marriages: [], phase: 'playing', winnerId: null, result: null };
  return { state, events: [{ type: 'snapsStarted', dealOrder, hands: Object.fromEntries(players.map((p) => [p.id, structuredClone(p.hand)])), trumpCard: { ...trumpCard }, startingPlayerId: ids[start]! }] };
}

export type SnapsApplyResult = { ok: true; state: SnapsState; events: SnapsEvent[] } | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
const viewish = (s: SnapsState) => ({ trick: s.trick, trump: s.trump, trumpCard: s.trumpCard, closedBy: s.closedBy, talonCount: s.talon.length, phase: s.phase });

export function applySnapsAction(prev: SnapsState, playerId: string, action: SnapsAction | { type: string }): SnapsApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== playerId) return { ok: false, error: 'not-your-turn' };
  const legal = snapsLegal(viewish(prev), prev.players[prev.currentIndex]!.hand, true);
  const match = legal.find((a) => a.type === action.type && (a.type !== 'snapsPlay' || ('cardId' in action && a.cardId === action.cardId)));
  if (!match) return { ok: false, error: 'illegal-action' };
  const state = structuredClone(prev); const events: SnapsEvent[] = [];
  const me = state.players[state.currentIndex]!;
  if (match.type === 'snapsExchange') {
    const nineIndex = me.hand.findIndex((c) => c.suit === state.trump && c.rank === '9');
    const nine = me.hand.splice(nineIndex, 1)[0]!, taken = state.trumpCard!;
    me.hand.push(taken); state.trumpCard = nine;
    events.push({ type: 'snapsExchanged', playerId, nine: { ...nine }, taken: { ...taken } }, { type: 'snapsTurn', playerId });
    return { ok: true, state, events };
  }
  if (match.type === 'snapsClose') {
    state.closedBy = playerId;
    events.push({ type: 'snapsClosed', playerId }, { type: 'snapsTurn', playerId });
    return { ok: true, state, events };
  }
  const card = me.hand.splice(me.hand.findIndex((c) => c.id === match.cardId), 1)[0]!;
  // A marriage is declared with the lead; it is announced unless the action opts out explicitly.
  const declare = match.marriage && (action as { marriage?: boolean }).marriage !== false;
  let marriage: { suit: Suit; points: number } | null = null;
  if (declare) {
    marriage = { suit: card.suit, points: card.suit === state.trump ? 40 : 20 };
    state.marriages.push({ playerId, ...marriage });
    if (me.tricks > 0) me.points += marriage.points; else me.pending += marriage.points;
  }
  state.trick.push({ playerId, card });
  events.push({ type: 'snapsPlayed', playerId, card: { ...card }, marriage });
  if (marriage && me.points >= 66) return finish(state, events, playerId, 'reached66');
  if (state.trick.length < 2) {
    state.currentIndex = 1 - state.currentIndex;
    events.push({ type: 'snapsTurn', playerId: state.players[state.currentIndex]!.id });
    return { ok: true, state, events };
  }
  // Resolve the trick, then draw while the talon is open.
  const winner = trickWinner(state.trick, state.trump, SNAPS_ORDER);
  const wi = state.players.findIndex((p) => p.id === winner.playerId), w = state.players[wi]!;
  w.points += state.trick.reduce((n, p) => n + snapsCardPoints(p.card), 0) + w.pending; w.pending = 0; w.tricks++;
  events.push({ type: 'snapsTrick', winnerId: w.id, cards: structuredClone(state.trick), points: Object.fromEntries(state.players.map((p) => [p.id, p.points])) });
  state.trick = []; state.leaderIndex = wi; state.currentIndex = wi;
  if (w.points >= 66) return finish(state, events, w.id, 'reached66');
  if (!state.closedBy && (state.talon.length || state.trumpCard)) {
    for (const p of [w, state.players[1 - wi]!]) {
      if (state.talon.length) { const c = state.talon.pop()!; p.hand.push(c); events.push({ type: 'snapsDrawn', playerId: p.id, card: { ...c }, fromTrump: false }); }
      else if (state.trumpCard) { const c = state.trumpCard; state.trumpCard = null; p.hand.push(c); events.push({ type: 'snapsDrawn', playerId: p.id, card: { ...c }, fromTrump: true }); }
    }
  }
  if (state.players.every((p) => !p.hand.length)) {
    if (state.closedBy) return finish(state, events, state.players.find((p) => p.id !== state.closedBy)!.id, 'closedFailed');
    return finish(state, events, w.id, 'lastTrick');
  }
  events.push({ type: 'snapsTurn', playerId: w.id });
  return { ok: true, state, events };
}

function finish(state: SnapsState, events: SnapsEvent[], winnerId: string, reason: SnapsResult['reason']): SnapsApplyResult {
  const loser = state.players.find((p) => p.id !== winnerId)!;
  const gamePoints = reason === 'closedFailed' ? 2 : reason === 'lastTrick' ? 1 : loser.tricks === 0 ? 3 : loser.points < 33 ? 2 : 1;
  state.phase = 'finished'; state.winnerId = winnerId;
  state.result = { winnerIds: [winnerId], gamePoints, reason, points: Object.fromEntries(state.players.map((p) => [p.id, p.points])) };
  events.push({ type: 'snapsEnded', result: structuredClone(state.result) });
  return { ok: true, state, events };
}

export function removeSnapsPlayer(prev: SnapsState, playerId: string): { state: SnapsState; events: SnapsEvent[] } {
  if (prev.phase !== 'playing' || !prev.players.some((p) => p.id === playerId)) return { state: prev, events: [] };
  const state = structuredClone(prev);
  state.phase = 'finished'; state.winnerId = state.players.find((p) => p.id !== playerId)?.id ?? null;
  state.result = { winnerIds: state.players.filter((p) => p.id !== playerId).map((p) => p.id), gamePoints: 3, reason: 'forfeit', points: Object.fromEntries(state.players.map((p) => [p.id, p.points])) };
  return { state, events: [{ type: 'snapsEnded', result: structuredClone(state.result) }] };
}
