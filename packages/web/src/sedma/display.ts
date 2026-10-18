import type { EnvironmentSignal } from '../table/environment';
import type { Card, SedmaClientEvent, SedmaView } from '@balik/shared';
import type { CardEntity } from '../table/display';
import { sortHand } from '../table/display';
import type { SoundKind } from '../brand/tokens';

export interface SedmaDisplay {
  view: SedmaView;
  hands: Record<string, CardEntity[]>;
  trick: { playerId: string; entity: CardEntity }[];
  outgoing: CardEntity[];
  captureTo: string | null;
  stamp: number;
  resolution: { winnerId: string; points: number } | null;
}
export interface SedmaStep { environment?: EnvironmentSignal; apply: (d: SedmaDisplay) => SedmaDisplay; wait: number; sound?: SoundKind }
let hidden = 0;
const entity = (card: Card | null, stamp: number, extra: Partial<CardEntity> = {}): CardEntity => ({
  key: card?.id ?? `sedma-hidden-${++hidden}`, card, move: null, moveStamp: stamp, spawn: null, delay: 0, flash: null, ...extra,
});
export function reconcileSedma(view: SedmaView, me: string, prev?: SedmaDisplay): SedmaDisplay {
  const all = [...Object.values(prev?.hands ?? {}).flat(), ...(prev?.trick.map((p) => p.entity) ?? [])];
  const known = new Map(all.filter((e) => e.card).map((e) => [e.card!.id, e]));
  const stamp = (prev?.stamp ?? 0) + 1;
  const hands = Object.fromEntries(view.players.map((p) => {
    if (p.id === me) return [p.id, sortHand((view.myHand ?? []).map((c) => known.get(c.id) ?? entity(c, stamp)))];
    const kept = (prev?.hands[p.id] ?? []).filter((e) => !e.card).slice(0, p.handCount);
    while (kept.length < p.handCount) kept.push(entity(null, stamp));
    return [p.id, kept];
  }));
  return { view, hands, stamp, trick: view.trick.map((p) => ({ playerId: p.playerId, entity: known.get(p.card.id) ?? entity(p.card, stamp) })), outgoing: [], captureTo: null, resolution: null };
}
export function sedmaSteps(event: SedmaClientEvent, me: string, target: SedmaView): SedmaStep[] {
  switch (event.type) {
    case 'sedmaStarted': {
      let own = 0;
      return [{ wait: 0, environment: {kind:'deal'}, apply: (d) => ({ ...reconcileSedma({ ...target, myHand: [], trick: [], drawCount: 32, scores: [0, 0], phase: 'playing', result: null, players: target.players.map((p) => ({ ...p, handCount: 0 })) }, me), stamp: d.stamp + 1 }) },
        ...event.dealOrder.map((id) => {
          const card = id === me ? event.myCards[own++]! : null;
          return { wait: 85, sound: 'deal' as const, apply: (d: SedmaDisplay) => {
            const stamp = d.stamp + 1;
            const hand = [...(d.hands[id] ?? []), entity(card, stamp, { move: 'deal', spawn: { kind: 'deck' } })];
            return { ...d, stamp, hands: { ...d.hands, [id]: id === me ? sortHand(hand) : hand }, view: { ...d.view, drawCount: d.view.drawCount - 1 } };
          } };
        }), { wait: 480, apply: (d) => d }];
    }
    case 'sedmaPlayed': return [{ wait: 500, environment: {kind:'play',sourcePlayerId:event.playerId}, sound: 'play', apply: (d) => {
      const stamp = d.stamp + 1;
      const hand = [...(d.hands[event.playerId] ?? [])];
      const index = event.playerId === me ? hand.findIndex((e) => e.card?.id === event.card.id) : Math.max(0, hand.length - 1);
      const moved = hand.splice(index, 1)[0] ?? entity(event.card, stamp, { spawn: { kind: 'seat', playerId: event.playerId, index: 0, count: 1 } });
      const played = { ...moved, card: event.card, move: 'play' as const, moveStamp: stamp, delay: 0 };
      return { ...d, stamp, resolution: null, trick: [...d.trick, { playerId: event.playerId, entity: played }], hands: { ...d.hands, [event.playerId]: hand }, view: { ...d.view, deciding: false, leadRank: d.view.leadRank ?? event.card.rank, trick: [...d.view.trick, { playerId: event.playerId, card: event.card }] } };
    } }];
    case 'trickResolved': return [
      { wait: 360, sound: 'special', apply: (d) => ({ ...d, resolution: { winnerId: event.winnerId, points: event.points } }) },
      { wait: 440, environment: {kind:'collect',targetPlayerId:event.winnerId}, sound: 'draw', apply: (d) => ({ ...d, stamp: d.stamp + 1, captureTo: event.winnerId,
        outgoing: d.trick.map((p) => ({ ...p.entity, move: 'toDeck', moveStamp: d.stamp + 1, spawn: null })), trick: [],
        view: { ...d.view, trick: [], leadRank: null, scores: event.scores, lastTrick: { winnerId: event.winnerId, team: event.team, points: event.points, cards: event.cards } } }) },
      { wait: 0, apply: (d) => ({ ...d, outgoing: [] }) },
    ];
    case 'sedmaDrawn': return [{ wait: 170, environment: {kind:'draw',targetPlayerId:event.playerId}, sound: 'deal', apply: (d) => {
      const stamp = d.stamp + 1;
      const cards = Array.from({ length: event.count }, (_, i) => entity(event.playerId === me ? event.cards?.[i] ?? null : null, stamp, { move: 'draw', spawn: { kind: 'deck' }, delay: i * .06 }));
      const hand = [...(d.hands[event.playerId] ?? []), ...cards];
      return { ...d, stamp, hands: { ...d.hands, [event.playerId]: event.playerId === me ? sortHand(hand) : hand }, view: { ...d.view, drawCount: Math.max(0, d.view.drawCount - event.count) } };
    } }];
    case 'sedmaTurn': return [{ wait: 0, apply: (d) => ({ ...d, view: { ...d.view, currentPlayerId: event.playerId, deciding: event.deciding } }) }];
    case 'sedmaEnded': return [{ wait: 150, environment: event.result.winnerIds.length ? {kind:'win',targetPlayerId:event.result.winnerIds[0]} : undefined, sound: event.result.winnerTeam === null ? 'reaction' : event.result.winnerIds.includes(me) ? 'win' : 'lose', apply: (d) => ({ ...d, view: { ...d.view, phase: 'finished', result: event.result, winnerId: event.result.winnerIds[0] ?? null, scores: event.result.scores } }) }];
  }
}
