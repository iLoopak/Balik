import type { EnvironmentSignal } from '../table/environment';
import type { Card, LharClientEvent, LharResolution, LharView } from '@balik/shared';
import type { CardEntity } from '../table/display';
import { sortHand } from '../table/display';
import type { SoundKind } from '../brand/tokens';
export interface LharPileCard {
  entity: CardEntity;
  claimId: number;
}
export interface LharDisplay {
  view: LharView;
  hands: Record<string, CardEntity[]>;
  pile: LharPileCard[];
  stamp: number;
  resolution: LharResolution | null;
  beat: 'quiet' | 'challenge' | 'reveal' | 'take';
}
export interface LharStep {
  environment?: EnvironmentSignal;
  apply: (d: LharDisplay) => LharDisplay;
  wait: number;
  quietWait?: number;
  sound?: SoundKind;
}
let hidden = 0;
const entity = (card: Card | null, stamp: number, extra: Partial<CardEntity> = {}): CardEntity => ({
  key: card?.id ?? `lhar-hidden-${++hidden}`,
  card,
  move: null,
  moveStamp: stamp,
  spawn: null,
  delay: 0,
  flash: null,
  ...extra,
});
/** A reconnect renders concealed placeholders; an old public resolution is history, never a new flip. */
export function reconcileLhar(view: LharView, me: string, prev?: LharDisplay): LharDisplay {
  const stamp = (prev?.stamp ?? 0) + 1;
  const known = new Map(
    [...Object.values(prev?.hands ?? {}).flat(), ...(prev?.pile.map((p) => p.entity) ?? [])]
      .filter((e) => e.card)
      .map((e) => [e.card!.id, e]),
  );
  const hands = Object.fromEntries(
    view.players.map((p) => {
      if (p.id === me)
        return [
          p.id,
          sortHand(
            (view.myHand ?? []).map((c) => ({
              ...(known.get(c.id) ?? entity(c, stamp)),
              card: c,
              move: null,
              spawn: null,
            })),
          ),
        ];
      const kept: CardEntity[] = (prev?.hands[p.id] ?? [])
        .filter((e) => !e.card)
        .slice(0, p.handCount)
        .map((e) => ({ ...e, move: null, spawn: null }));
      while (kept.length < p.handCount) kept.push(entity(null, stamp));
      return [p.id, kept];
    }),
  );
  const same = prev?.view.lastClaim?.id === view.lastClaim?.id && prev?.pile.length === view.pileCount;
  const pile = same
    ? prev!.pile.map((p) => ({ ...p, entity: { ...p.entity, move: null, spawn: null } }))
    : Array.from({ length: view.pileCount }, (_, i) => ({
        entity: entity(null, stamp),
        claimId: i >= view.pileCount - (view.lastClaim?.count ?? 0) ? (view.lastClaim?.id ?? 0) : 0,
      }));
  return { view, hands, pile, stamp, resolution: null, beat: 'quiet' };
}
export function lharSteps(event: LharClientEvent, me: string, target: LharView): LharStep[] {
  switch (event.type) {
    case 'lharStarted': {
      let own = 0;
      return [
        {
          wait: 0,
          environment: {kind:'deal'},
          apply: (d) => ({
            ...reconcileLhar(
              {
                ...target,
                myHand: [],
                players: target.players.map((p) => ({ ...p, handCount: 0 })),
                pileCount: 0,
                lastClaim: null,
                lastResolution: null,
                history: [],
                pendingWinnerId: null,
                phase: 'playing',
                result: null,
                winnerId: null,
                requiredRank: '7',
                currentPlayerId: event.startingPlayerId,
              },
              me,
            ),
            stamp: d.stamp + 1,
          }),
        },
        ...event.dealOrder.map((id) => {
          const card = id === me ? event.myCards[own++]! : null;
          return {
            wait: 45,
            sound: 'deal' as const,
            apply: (d: LharDisplay) => {
              const stamp = d.stamp + 1;
              const hand = [
                ...(d.hands[id] ?? []),
                entity(card, stamp, { move: 'deal', spawn: { kind: 'deck' } }),
              ];
              return { ...d, stamp, hands: { ...d.hands, [id]: id === me ? sortHand(hand) : hand } };
            },
          };
        }),
        { wait: 300, apply: (d) => d },
      ];
    }
    case 'lharPlayed':
      return [
        {
          wait: 440,
          environment: {kind:'play',sourcePlayerId:event.claim.playerId},
          sound: 'play',
          apply: (d) => {
            const stamp = d.stamp + 1,
              hand = [...(d.hands[event.claim.playerId] ?? [])];
            const moved = Array.from({ length: event.claim.count }, (_, i) => {
              const card = event.claim.playerId === me ? (event.myCards?.[i] ?? null) : null;
              const index = card ? hand.findIndex((e) => e.card?.id === card.id) : hand.length - 1;
              const e = index >= 0 ? hand.splice(index, 1)[0]! : entity(null, stamp);
              return {
                claimId: event.claim.id,
                entity: { ...e, card, move: 'play' as const, moveStamp: stamp, spawn: null, delay: i * 0.04 },
              };
            });
            return {
              ...d,
              stamp,
              beat: 'quiet',
              resolution: null,
              pile: [...d.pile, ...moved],
              hands: { ...d.hands, [event.claim.playerId]: hand },
              view: {
                ...d.view,
                lastClaim: event.claim,
                pileCount: d.pile.length + moved.length,
                pendingWinnerId: hand.length === 0 ? event.claim.playerId : null,
                players: d.view.players.map((p) =>
                  p.id === event.claim.playerId ? { ...p, handCount: hand.length } : p,
                ),
              },
            };
          },
        },
      ];
    case 'lharResolved':
      return [
        {
          wait: 260,
          environment: {kind:'challenge'},
          quietWait: 0,
          apply: (d) =>
            d.view.lastClaim?.id !== event.resolution.claim.id
              ? d
              : { ...d, beat: 'challenge', resolution: event.resolution },
        },
        {
          wait: 850,
          environment: {kind:'reveal'},
          quietWait: 950,
          sound: 'special',
          apply: (d) => {
            if (d.view.lastClaim?.id !== event.resolution.claim.id) return d;
            const stamp = d.stamp + 1,
              indices = d.pile.flatMap((p, i) => (p.claimId === event.resolution.claim.id ? [i] : []));
            if (indices.length !== event.resolution.revealed.length) return d;
            return {
              ...d,
              stamp,
              beat: 'reveal',
              resolution: event.resolution,
              pile: d.pile.map((p, i) => {
                const n = indices.indexOf(i);
                return n < 0
                  ? p
                  : {
                      ...p,
                      entity: {
                        ...p.entity,
                        card: event.resolution.revealed[n]!,
                        move: 'flipStart',
                        moveStamp: stamp,
                        spawn: null,
                        delay: n * 0.07,
                      },
                    };
              }),
            };
          },
        },
      ];
    case 'lharTaken':
      return [
        {
          wait: 580,
          environment: {kind:'collect',targetPlayerId:event.playerId},
          quietWait: 450,
          sound: 'draw',
          apply: (d) => {
            if (d.resolution?.claim.id !== event.claimId || d.pile.length !== event.count) return d;
            const stamp = d.stamp + 1;
            const moved = d.pile.map((p, i) => ({
              ...p.entity,
              card: event.playerId === me ? (event.cards?.[i] ?? null) : null,
              move: 'draw' as const,
              moveStamp: stamp,
              spawn: null,
              delay: Math.min(i * 0.025, 0.22),
            }));
            const hand = [...(d.hands[event.playerId] ?? []), ...moved];
            return {
              ...d,
              stamp,
              beat: 'take',
              pile: [],
              hands: { ...d.hands, [event.playerId]: event.playerId === me ? sortHand(hand) : hand },
              view: {
                ...d.view,
                lastClaim: null,
                pileCount: 0,
                pendingWinnerId: null,
                lastResolution: d.resolution,
                players: d.view.players.map((p) =>
                  p.id === event.playerId ? { ...p, handCount: hand.length } : p,
                ),
              },
            };
          },
        },
      ];
    case 'lharTurn':
      return [
        {
          wait: 0,
          apply: (d) => ({
            ...d,
            view: { ...d.view, currentPlayerId: event.playerId, requiredRank: event.requiredRank },
          }),
        },
      ];
    case 'lharEnded':
      return [
        {
          wait: 250,
          environment: event.result.winnerIds.length ? {kind:'win',targetPlayerId:event.result.winnerIds[0]} : undefined,
          sound: event.result.winnerIds.includes(me) ? 'win' : 'lose',
          apply: (d) => ({
            ...d,
            view: {
              ...d.view,
              phase: 'finished',
              pendingWinnerId: null,
              result: event.result,
              winnerId: event.result.winnerIds[0] ?? null,
            },
          }),
        },
      ];
  }
}
