import { publicClaim } from './engine';
import type { Rng } from '../cards';
import type { LharAction, LharClientEvent, LharEvent, LharState, LharView } from './types';
export function lharViewFor(state: LharState, id: string): LharView {
  return {
    players: state.players.map((p) => ({ id: p.id, handCount: p.hand.length })),
    myHand: structuredClone(state.players.find((p) => p.id === id)?.hand ?? null),
    pileCount: state.pile.length,
    lastClaim: state.lastClaim ? publicClaim(state.lastClaim) : null,
    requiredRank: state.requiredRank,
    currentPlayerId: state.players[state.currentIndex]!.id,
    pendingWinnerId:
      state.phase === 'playing' &&
      state.lastClaim &&
      state.players.find((p) => p.id === state.lastClaim!.playerId)!.hand.length === 0
        ? state.lastClaim.playerId
        : null,
    lastResolution: structuredClone(state.lastResolution),
    history: structuredClone(state.history),
    phase: state.phase,
    winnerId: state.winnerId,
    result: structuredClone(state.result),
  };
}
export function filterLharEventFor(event: LharEvent, id: string): LharClientEvent {
  switch (event.type) {
    case 'lharStarted':
      return {
        type: event.type,
        dealOrder: [...event.dealOrder],
        myCards: structuredClone(event.hands[id] ?? []),
        startingPlayerId: event.startingPlayerId,
      };
    case 'lharPlayed':
      return {
        type: event.type,
        claim: publicClaim(event.claim),
        ...(event.claim.playerId === id ? { myCards: structuredClone(event.cards) } : {}),
      };
    case 'lharTaken':
      return {
        type: event.type,
        playerId: event.playerId,
        claimId: event.claimId,
        count: event.cards.length,
        ...(event.playerId === id ? { cards: structuredClone(event.cards) } : {}),
      };
    case 'lharResolved':
      return { type: event.type, resolution: structuredClone(event.resolution) };
    case 'lharTurn':
      return { type: event.type, playerId: event.playerId, requiredRank: event.requiredRank };
    case 'lharEnded':
      return { type: event.type, result: structuredClone(event.result) };
  }
}
export function lharCanAct(view: LharView, id: string) {
  return view.phase === 'playing' && view.currentPlayerId === id;
}
/** This function never receives raw hands or the hidden pile. */
export function chooseLharBotFromView(view: LharView, id: string, rng: Rng): LharAction {
  if (!lharCanAct(view, id) || !view.myHand?.length) throw new Error('No legal Lhar bot action');
  const claim = view.lastClaim;
  if (claim) {
    const known = (view.myHand ?? []).filter((c) => c.rank === claim.rank).length;
    if (claim.count + known > 4) return { type: 'lharChallenge', claimId: claim.id };
    if (view.pendingWinnerId)
      return { type: rng() < 0.65 ? 'lharChallenge' : 'lharAccept', claimId: claim.id };
    if (rng() < 0.28) return { type: 'lharChallenge', claimId: claim.id };
  }
  const trueCards = view.myHand.filter((c) => c.rank === view.requiredRank);
  const first =
    trueCards[0] ?? view.myHand[Math.min(view.myHand.length - 1, Math.floor(rng() * view.myHand.length))]!;
  const limit = trueCards.length ? 4 : rng() < 0.4 ? 2 : 1;
  const group = view.myHand.filter((c) => c.rank === first.rank).slice(0, limit);
  return { type: 'lharPlay', cardIds: group.map((c) => c.id), declaredRank: view.requiredRank };
}
