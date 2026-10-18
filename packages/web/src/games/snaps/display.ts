import type { Card, SnapsClientEvent, SnapsView } from '@balik/shared';
import { sortHand, type CardEntity } from '../../table/display';
import type { GameScript, GameStep } from '../useGameDirector';
import { entity, knownEntities, reconcileHands, takeFromHand } from '../entities';

export interface SnapsDisplay {
  view: SnapsView;
  hands: Record<string, CardEntity[]>;
  trick: { playerId: string; entity: CardEntity }[];
  trump: CardEntity | null;
  outgoing: CardEntity[];
  captureTo: string | null;
  stamp: number;
  banner: string | null;
}
type Step = GameStep<SnapsDisplay>;

export function reconcileSnaps(view: SnapsView, me: string, prev?: SnapsDisplay): SnapsDisplay {
  const known = knownEntities(...Object.values(prev?.hands ?? {}), prev?.trick.map((p) => p.entity), prev?.trump ? [prev.trump] : []);
  const stamp = (prev?.stamp ?? 0) + 1;
  return {
    view, stamp, outgoing: [], captureTo: null, banner: prev?.banner ?? null,
    hands: reconcileHands(view.players, me, view.myHand, prev?.hands, known, stamp, 'snaps'),
    trick: view.trick.map((p) => ({ playerId: p.playerId, entity: known.get(p.card.id) ?? entity(p.card, stamp) })),
    trump: view.trumpCard ? known.get(view.trumpCard.id) ?? entity(view.trumpCard, stamp) : null,
  };
}

const bump = (d: SnapsDisplay) => ({ ...d, stamp: d.stamp + 1 });
const addToHand = (d: SnapsDisplay, playerId: string, me: string, e: CardEntity) => {
  const hand = [...(d.hands[playerId] ?? []), e];
  return { ...d.hands, [playerId]: playerId === me ? sortHand(hand) : hand };
};

export function snapsSteps(event: SnapsClientEvent, me: string, target: SnapsView): Step[] {
  switch (event.type) {
    case 'snapsStarted': {
      let own = 0;
      const empty: SnapsView = { ...target, myHand: [], trick: [], trumpCard: null, closedBy: null, strict: false, marriages: [], phase: 'playing', result: null,
        talonCount: 24, players: target.players.map((p) => ({ ...p, handCount: 0, points: 0, tricks: 0, pending: 0 })) };
      return [
        { wait: 0, environment: { kind: 'deal' }, apply: (d) => ({ ...reconcileSnaps(empty, me), stamp: d.stamp + 1, banner: null }) },
        ...event.dealOrder.map((id): Step => {
          const card = id === me ? event.myCards[own++]! : null;
          return { wait: 80, sound: 'deal', apply: (d) => {
            const s = bump(d);
            return { ...s, hands: addToHand(s, id, me, entity(card, s.stamp, { move: 'deal', spawn: { kind: 'deck' } }, 'snaps')), view: { ...s.view, talonCount: s.view.talonCount - 1 } };
          } };
        }),
        { wait: 420, sound: 'special', apply: (d) => { const s = bump(d); return { ...s, trump: entity(event.trumpCard, s.stamp, { move: 'flipStart', spawn: { kind: 'deck' } }), view: { ...s.view, talonCount: s.view.talonCount - 1, trumpCard: event.trumpCard, trump: event.trumpCard.suit } }; } },
      ];
    }
    case 'snapsPlayed': return [{ wait: event.marriage ? 760 : 500, sound: event.marriage ? 'special' : 'play', environment: { kind: 'play', sourcePlayerId: event.playerId }, apply: (d) => {
      const s = bump(d);
      const { rest, taken } = takeFromHand(s.hands[event.playerId] ?? [], event.card, event.playerId === me);
      const played = { ...(taken ?? entity(event.card, s.stamp)), card: event.card, move: 'play' as const, moveStamp: s.stamp, delay: 0, spawn: taken ? null : { kind: 'seat' as const, playerId: event.playerId, index: 0, count: 1 } };
      return { ...s, hands: { ...s.hands, [event.playerId]: rest }, trick: [...s.trick, { playerId: event.playerId, entity: played }],
        banner: event.marriage ? `Hláška ${event.marriage.points}` : s.banner,
        view: { ...s.view, trick: [...s.view.trick, { playerId: event.playerId, card: event.card }], marriages: event.marriage ? [...s.view.marriages, { playerId: event.playerId, ...event.marriage }] : s.view.marriages } };
    } }];
    case 'snapsExchanged': return [{ wait: 700, sound: 'special', apply: (d) => {
      const s = bump(d);
      const { rest, taken } = takeFromHand(s.hands[event.playerId] ?? [], event.nine, event.playerId === me);
      const nine = { ...(taken ?? entity(event.nine, s.stamp)), card: event.nine, move: 'play' as const, moveStamp: s.stamp };
      const fromTrump = { ...(s.trump ?? entity(event.taken, s.stamp)), move: 'draw' as const, moveStamp: s.stamp };
      const hand = [...rest, fromTrump];
      return { ...s, trump: nine, banner: 'Výměna trumfové devítky', // The public trump keeps its key in an opponent's hand but shows its back like any held card.
        hands: { ...s.hands, [event.playerId]: event.playerId === me ? sortHand(hand.map((e) => e.key === fromTrump.key ? { ...e, card: event.taken } : e)) : hand.map((e) => e.key === fromTrump.key ? { ...e, card: null } : e) },
        view: { ...s.view, trumpCard: event.nine } };
    } }];
    case 'snapsClosed': return [{ wait: 600, sound: 'special', apply: (d) => ({ ...d, banner: 'Talon je zavřený', view: { ...d.view, closedBy: event.playerId, strict: true } }) }];
    case 'snapsTrick': return [
      { wait: 380, apply: (d) => ({ ...d, banner: null }) },
      { wait: 460, sound: 'draw', environment: { kind: 'collect', targetPlayerId: event.winnerId }, apply: (d) => {
        const s = bump(d);
        return { ...s, captureTo: event.winnerId, trick: [], outgoing: s.trick.map((p) => ({ ...p.entity, move: 'toDeck' as const, moveStamp: s.stamp })),
          view: { ...s.view, trick: [], leaderId: event.winnerId, players: s.view.players.map((p) => ({ ...p, points: event.points[p.id] ?? p.points, tricks: p.tricks + (p.id === event.winnerId ? 1 : 0), pending: p.id === event.winnerId ? 0 : p.pending })) } };
      } },
      { wait: 0, apply: (d) => ({ ...d, outgoing: [], captureTo: null }) },
    ];
    case 'snapsDrawn': return [{ wait: 260, sound: 'deal', environment: { kind: 'draw', targetPlayerId: event.playerId }, apply: (d) => {
      const s = bump(d);
      const card: Card | null = event.card ?? null;
      if (event.fromTrump && s.trump) {
        const moved = { ...s.trump, move: 'draw' as const, moveStamp: s.stamp, card: event.playerId === me ? card : null };
        return { ...s, trump: null, hands: addToHand(s, event.playerId, me, moved), view: { ...s.view, trumpCard: null } };
      }
      return { ...s, hands: addToHand(s, event.playerId, me, entity(event.playerId === me ? card : null, s.stamp, { move: 'draw', spawn: { kind: 'deck' } }, 'snaps')), view: { ...s.view, talonCount: Math.max(0, s.view.talonCount - 1) } };
    } }];
    case 'snapsTurn': return [{ wait: 0, apply: (d) => ({ ...d, view: { ...d.view, currentPlayerId: event.playerId } }) }];
    case 'snapsEnded': return [{ wait: 200, sound: event.result.winnerIds.includes(me) ? 'win' : 'lose', environment: event.result.winnerIds[0] ? { kind: 'win', targetPlayerId: event.result.winnerIds[0] } : undefined,
      apply: (d) => ({ ...d, banner: null, view: { ...d.view, phase: 'finished', result: event.result } }) }];
  }
}

export const SNAPS_SCRIPT: GameScript<'snaps', SnapsDisplay, SnapsClientEvent> = { gameId: 'snaps', startedType: 'snapsStarted', reconcile: reconcileSnaps, steps: snapsSteps };
