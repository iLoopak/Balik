import { SUITS, type Card, type Suit } from '../cards';
import { trickWinner } from '../tricks';
import { MARIAS_ORDER, MARIAS_ORDER_NO_TRUMP, mariasCardPoints, mariasDeclareOk, mariasLegal, mariasTrumpGame } from './engine';
import type { MariasAction, MariasClientEvent, MariasContract, MariasEvent, MariasState, MariasView } from './types';

export function mariasViewFor(state: MariasState, id: string): MariasView {
  return {
    players: state.players.map((p) => ({ id: p.id, handCount: p.hand.length, points: p.points, tricks: p.tricks })),
    myHand: structuredClone(state.players.find((p) => p.id === id)?.hand ?? null),
    declarerId: state.players[state.declarerIndex]!.id, phase: state.phase, trump: state.trump, trumpCard: state.trumpCard ? { ...state.trumpCard } : null,
    contract: state.contract, sedma: state.sedma, flek: state.flek, trick: structuredClone(state.trick), leaderId: state.players[state.leaderIndex]!.id,
    currentPlayerId: state.players[state.currentIndex]!.id, marriages: structuredClone(state.marriages), lastTrick: structuredClone(state.lastTrick),
    talonCount: state.talon.length, talon: state.phase === 'finished' ? structuredClone(state.talon) : null,
    winnerId: state.winnerId, result: structuredClone(state.result),
  };
}
export function filterMariasEventFor(event: MariasEvent, id: string): MariasClientEvent {
  if (event.type === 'mariasStarted') return { type: event.type, declarerId: event.declarerId, firstCount: event.first.length, first: event.declarerId === id ? structuredClone(event.first) : null };
  if (event.type === 'mariasDealt') return { type: event.type, counts: Object.fromEntries(Object.entries(event.hands).map(([p, cards]) => [p, cards.length])), myCards: structuredClone(event.hands[id] ?? []) };
  if (event.type === 'mariasDeclared') return { type: event.type, playerId: event.playerId, contract: event.contract, sedma: event.sedma, discardCount: event.discard.length, ...(event.playerId === id ? { discard: structuredClone(event.discard) } : {}) };
  return structuredClone(event);
}
export function mariasLegalFromView(view: MariasView, id: string): MariasAction[] {
  return mariasLegal(view, view.myHand ?? [], view.currentPlayerId === id);
}

const strength = (c: Card, contract: MariasContract | null) => (mariasTrumpGame(contract) ? MARIAS_ORDER : MARIAS_ORDER_NO_TRUMP).indexOf(c.rank);
const trumpStrength = (hand: readonly Card[], trump: Suit | null) => {
  const trumps = hand.filter((c) => c.suit === trump);
  return { count: trumps.length, top: trumps.filter((c) => c.rank === 'A' || c.rank === '10').length, aces: hand.filter((c) => c.rank === 'A').length };
};
/**
 * Chooses the longest, strongest suit as trump; bets betl on a hand without high cards. With the
 * trump marriage and a long, strong trump suit it plays kilo; holding the trump 7 in a long suit it adds a sedma.
 */
export function mariasBotDeclare(hand: readonly Card[], trump: Suit): Extract<MariasAction, { type: 'mariasDeclare' }> {
  const high = hand.filter((c) => ['10', 'J', 'Q', 'K', 'A'].includes(c.rank)).length;
  if (high <= 1) {
    const discard = [...hand].sort((a, b) => strength(b, 'betl') - strength(a, 'betl')).slice(0, 2).map((c) => c.id);
    return { type: 'mariasDeclare', discard, contract: 'betl' };
  }
  const candidates = hand.filter((c) => c.suit !== trump && c.rank !== 'A' && c.rank !== '10' && !((c.rank === 'K' || c.rank === 'Q') && hand.some((o) => o.suit === c.suit && o.rank === (c.rank === 'K' ? 'Q' : 'K'))));
  const pool = candidates.length >= 2 ? candidates : hand.filter((c) => c.rank !== 'A' && c.rank !== '10');
  const discard = [...pool].sort((a, b) => strength(a, 'hra') - strength(b, 'hra')).slice(0, 2).map((c) => c.id);
  const t = trumpStrength(hand, trump);
  const contract = t.count >= 5 && t.top >= 1 && t.aces >= 2 && mariasDeclareOk(hand, trump, discard, 'kilo') ? 'kilo' : 'hra';
  const sedma = t.count >= 5 && mariasDeclareOk(hand, trump, discard, contract, true);
  return { type: 'mariasDeclare', discard, contract, ...(sedma ? { sedma } : {}) };
}
/** Defenders flek a trump game when they hold trumps and an ace of them; the declarer answers re on a very long trump suit. */
export function mariasBotFlek(view: MariasView, hand: readonly Card[], id: string): boolean {
  if (!mariasTrumpGame(view.contract) || view.flek >= 2) return false;
  const t = trumpStrength(hand, view.trump);
  return view.declarerId === id ? t.count >= 7 : t.count >= 3 && hand.some((c) => c.suit === view.trump && c.rank === 'A');
}
export function mariasBotTrump(hand: readonly Card[]): string {
  const score = (s: Suit) => hand.filter((c) => c.suit === s).reduce((n, c) => n + 2 + (c.rank === 'A' || c.rank === '10' ? 2 : c.rank === 'K' || c.rank === 'Q' ? 1 : 0), 0);
  const suit = [...SUITS].sort((a, b) => score(b) - score(a))[0]!;
  return [...hand].filter((c) => c.suit === suit).sort((a, b) => strength(a, 'hra') - strength(b, 'hra'))[0]!.id;
}
/** Plays only from the seat's view: defenders cooperate, the declarer takes valuable tricks. */
export function chooseMariasBotFromView(view: MariasView, id: string): MariasAction {
  const hand = view.myHand ?? [];
  if (view.phase === 'choosingTrump') return { type: 'mariasTrump', cardId: mariasBotTrump(hand) };
  if (view.phase === 'declaring') return mariasBotDeclare(hand, view.trump!);
  if (view.phase === 'flek') return { type: 'mariasFlek', flek: mariasBotFlek(view, hand, id) };
  const declarer = view.declarerId === id;
  const all = mariasLegalFromView(view, id).flatMap((a) => (a.type === 'mariasPlay' ? [hand.find((c) => c.id === a.cardId)!] : []));
  // A declarer with a sedma keeps the trump 7 for the last trick whenever another card is allowed.
  const keep = (c: Card) => declarer && view.sedma && c.suit === view.trump && c.rank === '7';
  const legal = all.some((c) => !keep(c)) ? all.filter((c) => !keep(c)) : all;
  const contract = view.contract;
  const trump = mariasTrumpGame(contract) ? view.trump : null;
  const order = mariasTrumpGame(contract) ? MARIAS_ORDER : MARIAS_ORDER_NO_TRUMP;
  const low = (cards: Card[]) => [...cards].sort((a, b) => strength(a, contract) - strength(b, contract) + (a.suit === trump ? 8 : 0) - (b.suit === trump ? 8 : 0))[0]!;
  const high = (cards: Card[]) => [...cards].sort((a, b) => strength(b, contract) - strength(a, contract))[0]!;
  if (contract === 'betl') return { type: 'mariasPlay', cardId: (declarer ? low(legal) : high(legal)).id };
  if (contract === 'durch') return { type: 'mariasPlay', cardId: (declarer ? high(legal) : low(legal)).id };
  if (!view.trick.length) {
    const ace = legal.find((c) => c.rank === 'A' && c.suit !== trump);
    return { type: 'mariasPlay', cardId: (ace ?? low(legal)).id };
  }
  const wins = legal.filter((c) => trickWinner([...view.trick, { playerId: id, card: c }], trump, order).playerId === id);
  const current = trickWinner(view.trick, trump, order).playerId;
  const friendWinning = !declarer && current !== view.declarerId;
  const worth = view.trick.reduce((n, p) => n + mariasCardPoints(p.card), 0);
  // A defender lays points on a partner's winning trick; otherwise win cheaply when it pays.
  if (friendWinning && view.trick.length === 2) { const points = legal.filter((c) => mariasCardPoints(c) && c.suit !== trump); if (points.length) return { type: 'mariasPlay', cardId: points[0]!.id }; }
  if (wins.length && (worth > 0 || view.trick.length === 2 || declarer)) return { type: 'mariasPlay', cardId: low(wins).id };
  return { type: 'mariasPlay', cardId: low(legal.filter((c) => !mariasCardPoints(c)).length ? legal.filter((c) => !mariasCardPoints(c)) : legal).id };
}
