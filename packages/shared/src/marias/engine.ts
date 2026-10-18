import { createDeck32, shuffle, type Card, type Rng, type Suit } from '../cards';
import { legalTrickCards, trickWinner, type RankOrder } from '../tricks';
import type { MariasAction, MariasContract, MariasEvent, MariasResult, MariasState } from './types';

/** Volený mariáš for three. With trumps 10 ranks between the king and the ace. */
export const MARIAS_ORDER: RankOrder = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];
export const MARIAS_ORDER_NO_TRUMP: RankOrder = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const isMarias = (state: object): state is MariasState => 'kind' in state && state.kind === 'marias';
export const mariasCardPoints = (c: Card) => (c.rank === 'A' || c.rank === '10' ? 10 : 0);
const orderFor = (contract: MariasContract | null) => (contract === 'hra' ? MARIAS_ORDER : MARIAS_ORDER_NO_TRUMP);
const partner = (hand: readonly Card[], card: Card) => (card.rank === 'K' || card.rank === 'Q') && hand.some((c) => c.suit === card.suit && c.rank === (card.rank === 'K' ? 'Q' : 'K'));

/** Laid-away cards: exactly two from the hand, never an ace or a ten in a trump game. */
export function mariasDiscardOk(hand: readonly Card[], discard: readonly string[], contract: MariasContract): boolean {
  if (discard.length !== 2 || discard[0] === discard[1]) return false;
  const cards = discard.map((id) => hand.find((c) => c.id === id));
  return cards.every((c) => c && (contract !== 'hra' || (c.rank !== 'A' && c.rank !== '10')));
}

export function mariasLegal(view: { phase: string; trick: { playerId: string; card: Card }[]; trump: Suit | null; contract: MariasContract | null }, hand: readonly Card[], myTurn: boolean): MariasAction[] {
  if (!myTurn) return [];
  if (view.phase === 'choosingTrump') return hand.map((c) => ({ type: 'mariasTrump' as const, cardId: c.id }));
  if (view.phase !== 'playing') return [];
  const trump = view.contract === 'hra' ? view.trump : null;
  return legalTrickCards(hand, view.trick, trump, orderFor(view.contract)).map((c) => ({ type: 'mariasPlay' as const, cardId: c.id }));
}

export function createMariasRound(ids: string[], startingIndex: number, rng: Rng): { state: MariasState; events: MariasEvent[] } {
  if (ids.length !== 3 || new Set(ids).size !== 3) throw new Error('Mariáš requires 3 unique players');
  const start = ((startingIndex % 3) + 3) % 3;
  const stock = shuffle(createDeck32(), rng);
  const players = ids.map((id) => ({ id, hand: [] as Card[], points: 0, tricks: 0 }));
  const declarer = players[start]!;
  for (let i = 0; i < 7; i++) declarer.hand.push(stock.pop()!);
  const state: MariasState = { kind: 'marias', players, stock, talon: [], declarerIndex: start, phase: 'choosingTrump', trump: null, trumpCard: null, contract: null,
    trick: [], leaderIndex: start, currentIndex: start, marriages: [], lastTrick: null, winnerId: null, result: null };
  return { state, events: [{ type: 'mariasStarted', declarerId: declarer.id, first: structuredClone(declarer.hand) }, { type: 'mariasTurn', playerId: declarer.id }] };
}

export type MariasApplyResult = { ok: true; state: MariasState; events: MariasEvent[] } | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
export function applyMariasAction(prev: MariasState, playerId: string, action: MariasAction | { type: string }): MariasApplyResult {
  if (prev.phase === 'finished') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== playerId) return { ok: false, error: 'not-your-turn' };
  const s = structuredClone(prev); const events: MariasEvent[] = [];
  const me = s.players[s.currentIndex]!;
  if (action.type === 'mariasTrump' && s.phase === 'choosingTrump' && 'cardId' in action) {
    const card = me.hand.find((c) => c.id === action.cardId);
    if (!card) return { ok: false, error: 'illegal-action' };
    s.trump = card.suit; s.trumpCard = { ...card };
    events.push({ type: 'mariasTrump', playerId, card: { ...card } });
    // Deal the rest: the declarer to twelve, the others ten each.
    const hands: Record<string, Card[]> = {};
    for (const p of s.players) { const n = p === me ? 5 : 10; const dealt = s.stock.splice(-n, n); p.hand.push(...dealt); hands[p.id] = structuredClone(dealt); }
    s.phase = 'declaring';
    events.push({ type: 'mariasDealt', hands }, { type: 'mariasTurn', playerId });
    return { ok: true, state: s, events };
  }
  if (action.type === 'mariasDeclare' && s.phase === 'declaring' && 'discard' in action) {
    const { discard, contract } = action as Extract<MariasAction, { type: 'mariasDeclare' }>;
    if (!['hra', 'betl', 'durch'].includes(contract) || !mariasDiscardOk(me.hand, discard, contract)) return { ok: false, error: 'illegal-action' };
    s.talon = discard.map((id) => me.hand.splice(me.hand.findIndex((c) => c.id === id), 1)[0]!);
    s.contract = contract; s.phase = 'playing';
    events.push({ type: 'mariasDeclared', playerId, contract, discard: structuredClone(s.talon) }, { type: 'mariasTurn', playerId });
    return { ok: true, state: s, events };
  }
  if (action.type !== 'mariasPlay' || s.phase !== 'playing' || !('cardId' in action)) return { ok: false, error: 'illegal-action' };
  if (!mariasLegal(s, me.hand, true).some((a) => 'cardId' in a && a.cardId === action.cardId)) return { ok: false, error: 'illegal-action' };
  const card = me.hand.splice(me.hand.findIndex((c) => c.id === action.cardId), 1)[0]!;
  // A marriage announces itself when its king or queen is played while holding the other.
  let marriage: { suit: Suit; points: number } | null = null;
  if (s.contract === 'hra' && partner(me.hand, card) && !s.marriages.some((m) => m.suit === card.suit)) {
    marriage = { suit: card.suit, points: card.suit === s.trump ? 40 : 20 };
    s.marriages.push({ playerId, ...marriage }); me.points += marriage.points;
  }
  s.trick.push({ playerId, card });
  events.push({ type: 'mariasPlayed', playerId, card: { ...card }, marriage });
  if (s.trick.length < 3) {
    s.currentIndex = (s.currentIndex + 1) % 3;
    events.push({ type: 'mariasTurn', playerId: s.players[s.currentIndex]!.id });
    return { ok: true, state: s, events };
  }
  const winner = trickWinner(s.trick, s.contract === 'hra' ? s.trump : null, orderFor(s.contract));
  const wi = s.players.findIndex((p) => p.id === winner.playerId), w = s.players[wi]!;
  const last = s.players.every((p) => !p.hand.length);
  if (s.contract === 'hra') w.points += s.trick.reduce((n, p) => n + mariasCardPoints(p.card), 0) + (last ? 10 : 0);
  w.tricks++;
  s.lastTrick = { winnerId: w.id, cards: structuredClone(s.trick) };
  events.push({ type: 'mariasTrick', winnerId: w.id, cards: structuredClone(s.trick), points: Object.fromEntries(s.players.map((p) => [p.id, p.points])) });
  s.trick = []; s.leaderIndex = wi; s.currentIndex = wi;
  const declarer = s.players[s.declarerIndex]!;
  if (s.contract === 'betl' && wi === s.declarerIndex) return finish(s, events, false, 'betl');
  if (s.contract === 'durch' && wi !== s.declarerIndex) return finish(s, events, false, 'durch');
  if (last) {
    if (s.contract === 'hra') return finish(s, events, declarer.points > defenders(s), 'points');
    return finish(s, events, true, s.contract === 'betl' ? 'betl' : 'durch');
  }
  events.push({ type: 'mariasTurn', playerId: w.id });
  return { ok: true, state: s, events };
}
const defenders = (s: MariasState) => s.players.filter((_, i) => i !== s.declarerIndex).reduce((n, p) => n + p.points, 0);

function finish(s: MariasState, events: MariasEvent[], declarerWins: boolean, reason: MariasResult['reason']): MariasApplyResult {
  const declarer = s.players[s.declarerIndex]!;
  s.phase = 'finished';
  s.result = { winnerIds: declarerWins ? [declarer.id] : s.players.filter((p) => p !== declarer).map((p) => p.id), declarerId: declarer.id, contract: s.contract ?? 'hra',
    declarerPoints: declarer.points, defenderPoints: defenders(s), reason };
  s.winnerId = s.result.winnerIds[0] ?? null;
  events.push({ type: 'mariasEnded', result: structuredClone(s.result), talon: structuredClone(s.talon) });
  return { ok: true, state: s, events };
}

export function removeMariasPlayer(prev: MariasState, playerId: string): { state: MariasState; events: MariasEvent[] } {
  if (prev.phase === 'finished' || !prev.players.some((p) => p.id === playerId)) return { state: prev, events: [] };
  const s = structuredClone(prev);
  s.phase = 'finished';
  s.result = { winnerIds: s.players.filter((p) => p.id !== playerId).map((p) => p.id), declarerId: s.players[s.declarerIndex]!.id, contract: s.contract ?? 'hra',
    declarerPoints: s.players[s.declarerIndex]!.points, defenderPoints: defenders(s), reason: 'forfeit' };
  s.winnerId = s.result.winnerIds[0] ?? null;
  return { state: s, events: [{ type: 'mariasEnded', result: structuredClone(s.result), talon: structuredClone(s.talon) }] };
}
