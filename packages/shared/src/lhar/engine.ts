import { createDeck32, RANKS, shuffle, type Rng } from '../cards';
import type { LharAction, LharClaim, LharEvent, LharState } from './types';
export const isLhar = (state: object): state is LharState => 'kind' in state && state.kind === 'lhar';
export function publicClaim(claim: LharClaim): LharClaim {
  return { id: claim.id, playerId: claim.playerId, rank: claim.rank, count: claim.count };
}
export function createLharRound(
  ids: string[],
  startingIndex: number,
  rng: Rng,
): { state: LharState; events: LharEvent[] } {
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length)
    throw new Error('Lhar requires 2–4 unique players');
  const start = ((startingIndex % ids.length) + ids.length) % ids.length;
  const deck = shuffle(createDeck32(), rng),
    players = ids.map((id) => ({ id, hand: [] as typeof deck }));
  const dealOrder: string[] = [];
  while (deck.length) {
    const p = players[(start + dealOrder.length) % ids.length]!;
    p.hand.push(deck.pop()!);
    dealOrder.push(p.id);
  }
  const state: LharState = {
    kind: 'lhar',
    players,
    pile: [],
    lastClaim: null,
    claimCounter: 0,
    requiredRank: '7',
    currentIndex: start,
    lastResolution: null,
    history: [],
    phase: 'playing',
    winnerId: null,
    result: null,
  };
  return {
    state,
    events: [
      {
        type: 'lharStarted',
        dealOrder,
        hands: Object.fromEntries(players.map((p) => [p.id, structuredClone(p.hand)])),
        startingPlayerId: ids[start]!,
      },
    ],
  };
}
export type LharApplyResult =
  | { ok: true; state: LharState; events: LharEvent[] }
  | { ok: false; error: 'not-your-turn' | 'illegal-action' | 'game-finished' };
export function applyLharAction(
  prev: LharState,
  id: string,
  action: LharAction | { type: string },
): LharApplyResult {
  if (prev.phase !== 'playing') return { ok: false, error: 'game-finished' };
  if (prev.players[prev.currentIndex]?.id !== id) return { ok: false, error: 'not-your-turn' };
  const claim = prev.lastClaim;
  const pending = claim && prev.players.find((p) => p.id === claim.playerId)!.hand.length === 0;
  if (action.type === 'lharPlay') {
    const a = action as Extract<LharAction, { type: 'lharPlay' }>;
    const hand = prev.players[prev.currentIndex]!.hand;
    if (
      pending ||
      a.declaredRank !== prev.requiredRank ||
      !Array.isArray(a.cardIds) ||
      a.cardIds.length < 1 ||
      a.cardIds.length > 4 ||
      new Set(a.cardIds).size !== a.cardIds.length ||
      !a.cardIds.every((key) => hand.some((c) => c.id === key))
    )
      return { ok: false, error: 'illegal-action' };
  } else if (action.type === 'lharChallenge' || action.type === 'lharAccept') {
    if (
      !claim ||
      !('claimId' in action) ||
      action.claimId !== claim.id ||
      (action.type === 'lharAccept' && !pending)
    )
      return { ok: false, error: 'illegal-action' };
  } else return { ok: false, error: 'illegal-action' };
  const state = structuredClone(prev),
    events: LharEvent[] = [];
  const finish = (winnerId: string) => {
    state.phase = 'finished';
    state.winnerId = winnerId;
    state.result = { winnerIds: [winnerId], reason: 'cards' };
    events.push({ type: 'lharEnded', result: structuredClone(state.result) });
  };
  const close = (outcome: 'accepted' | 'truth' | 'lie') => {
    const old = state.history.find((e) => e.id === state.lastClaim?.id);
    if (old) old.outcome = outcome;
  };
  if (action.type === 'lharPlay') {
    const a = action as Extract<LharAction, { type: 'lharPlay' }>;
    if (state.lastClaim) close('accepted');
    const player = state.players[state.currentIndex]!;
    const cards = a.cardIds.map((key) => player.hand.find((c) => c.id === key)!);
    player.hand = player.hand.filter((c) => !a.cardIds.includes(c.id));
    state.pile.push(...cards);
    state.lastClaim = {
      id: ++state.claimCounter,
      playerId: id,
      rank: a.declaredRank,
      count: cards.length,
      cards,
    };
    state.history = [
      ...state.history,
      { ...publicClaim(state.lastClaim), outcome: 'pending' as const },
    ].slice(-12);
    events.push({ type: 'lharPlayed', claim: publicClaim(state.lastClaim), cards: structuredClone(cards) });
    state.requiredRank = RANKS[(RANKS.indexOf(state.requiredRank) + 1) % RANKS.length]!;
    state.currentIndex = (state.currentIndex + 1) % state.players.length;
  } else if (action.type === 'lharAccept') {
    close('accepted');
    finish(claim!.playerId);
  } else {
    const last = state.lastClaim!;
    // Truth is evaluated only here. No play/turn response depends on hidden ranks.
    const truthful = last.cards.every((c) => c.rank === last.rank);
    const collectorId = truthful ? id : last.playerId;
    const nextId = truthful ? last.playerId : id;
    state.lastResolution = {
      claim: publicClaim(last),
      challengerId: id,
      truthful,
      revealed: structuredClone(last.cards),
      collectorId,
      pileCount: state.pile.length,
    };
    close(truthful ? 'truth' : 'lie');
    events.push({ type: 'lharResolved', resolution: structuredClone(state.lastResolution) });
    const collected = structuredClone(state.pile);
    state.players.find((p) => p.id === collectorId)!.hand.push(...state.pile);
    events.push({ type: 'lharTaken', playerId: collectorId, claimId: last.id, cards: collected });
    state.pile = [];
    state.lastClaim = null;
    state.requiredRank = last.rank;
    state.currentIndex = state.players.findIndex((p) => p.id === nextId);
    if (truthful && !state.players.find((p) => p.id === last.playerId)!.hand.length) finish(last.playerId);
  }
  if (state.phase === 'playing')
    events.push({
      type: 'lharTurn',
      playerId: state.players[state.currentIndex]!.id,
      requiredRank: state.requiredRank,
    });
  return { ok: true, state, events };
}
export function removeLharPlayer(prev: LharState, id: string): { state: LharState; events: LharEvent[] } {
  if (prev.phase !== 'playing' || !prev.players.some((p) => p.id === id)) return { state: prev, events: [] };
  const state = structuredClone(prev),
    remaining = state.players.filter((p) => p.id !== id);
  state.phase = 'finished';
  state.winnerId = remaining.length === 1 ? remaining[0]!.id : null;
  state.result = { winnerIds: state.winnerId ? [state.winnerId] : [], reason: 'forfeit' };
  return { state, events: [{ type: 'lharEnded', result: structuredClone(state.result) }] };
}
