import type { Card, PetrClientEvent, PetrView } from '@balik/shared';
import { sortHand, type CardEntity } from '../../table/display';
import type { GameScript, GameStep } from '../useGameDirector';
import { entity, knownEntities, reconcileHands } from '../entities';

export interface PetrDisplay {
  view: PetrView;
  hands: Record<string, CardEntity[]>;
  pile: CardEntity[];
  stamp: number;
  banner: string | null;
}
type Step = GameStep<PetrDisplay>;
const bump = (d: PetrDisplay) => ({ ...d, stamp: d.stamp + 1 });

export function reconcilePetr(view: PetrView, me: string, prev?: PetrDisplay): PetrDisplay {
  const known = knownEntities(...Object.values(prev?.hands ?? {}), prev?.pile);
  const stamp = (prev?.stamp ?? 0) + 1;
  return { view, stamp, banner: prev?.banner ?? null,
    hands: reconcileHands(view.players, me, view.myHand, prev?.hands, known, stamp, 'petr'),
    pile: view.pairs.flatMap((p) => p.cards).map((c) => known.get(c.id) ?? entity(c, stamp)) };
}

/** Moves a laid-down pair from a hand to the public pile, giving opponents' placeholders their faces. */
function layPair(d: PetrDisplay, playerId: string, me: string, cards: Card[]): PetrDisplay {
  let hand = [...(d.hands[playerId] ?? [])];
  const laid: CardEntity[] = [];
  for (const card of cards) {
    const i = playerId === me ? hand.findIndex((e) => e.card?.id === card.id) : hand.findIndex((e) => e.key === card.id) >= 0 ? hand.findIndex((e) => e.key === card.id) : hand.length - 1;
    const taken = i >= 0 ? hand.splice(i, 1)[0] : undefined;
    laid.push({ ...(taken ?? entity(card, d.stamp)), card, move: 'play', moveStamp: d.stamp, delay: (d.pile.length + laid.length) % 6 * .03 });
  }
  hand = playerId === me ? sortHand(hand) : hand;
  return { ...d, hands: { ...d.hands, [playerId]: hand }, pile: [...d.pile, ...laid] };
}

export function petrSteps(event: PetrClientEvent, me: string, target: PetrView): Step[] {
  switch (event.type) {
    case 'petrStarted': {
      let own = 0;
      const empty: PetrView = { ...target, myHand: [], pairs: [], finishOrder: [], phase: 'playing', result: null, winnerId: null, players: target.players.map((p) => ({ ...p, handCount: 0, out: false })) };
      return [
        { wait: 0, environment: { kind: 'deal' }, apply: (d) => ({ ...reconcilePetr(empty, me), pile: [], stamp: d.stamp + 1, banner: null }) },
        ...event.dealOrder.map((id): Step => {
          const card = id === me ? event.myCards[own++]! : null;
          return { wait: 34, sound: 'deal', apply: (d) => { const s = bump(d); const hand = [...(s.hands[id] ?? []), entity(card, s.stamp, { move: 'deal', spawn: { kind: 'deck' } }, 'petr')]; return { ...s, hands: { ...s.hands, [id]: id === me ? sortHand(hand) : hand } }; } };
        }),
        { wait: 300, apply: (d) => d },
        // All opening pairs go down in one step: a flip must finish before the next re-render.
        { wait: 760, sound: 'play', apply: (d) => event.pairs.reduce((acc, p) => layPair(acc, p.playerId, me, p.cards), bump(d)) },
      ];
    }
    case 'petrDrew': return [
      { wait: 640, sound: 'draw', environment: { kind: 'draw', sourcePlayerId: event.fromId, targetPlayerId: event.playerId }, apply: (d) => {
        const s = bump(d);
        const from = [...(s.hands[event.fromId] ?? [])];
        const i = event.fromId === me && event.card ? from.findIndex((e) => e.card?.id === event.card!.id) : Math.min(event.index, from.length - 1);
        const taken = from.splice(Math.max(0, i), 1)[0] ?? entity(null, s.stamp, {}, 'petr');
        const mine = event.playerId === me;
        // A drawn card keeps its key; it is face-down for everybody except the drawer.
        const moved: CardEntity = { ...taken, card: mine ? event.card ?? null : null, move: 'draw', moveStamp: s.stamp };
        const hand = [...(s.hands[event.playerId] ?? []), moved];
        return { ...s, hands: { ...s.hands, [event.fromId]: event.fromId === me ? sortHand(from) : from, [event.playerId]: mine ? sortHand(hand) : hand } };
      } },
      ...(event.pair ? [{ wait: 600, sound: 'special' as const, apply: (d: PetrDisplay) => layPair(bump(d), event.playerId, me, event.pair!) }] : []),
    ];
    case 'petrOut': return [{ wait: 500, sound: 'special', apply: (d) => ({ ...d, view: { ...d.view, finishOrder: [...d.view.finishOrder, event.playerId], players: d.view.players.map((p) => p.id === event.playerId ? { ...p, out: true } : p) } }) }];
    case 'petrTurn': return [{ wait: 0, apply: (d) => ({ ...d, view: { ...d.view, currentPlayerId: event.playerId, targetId: event.targetId } }) }];
    case 'petrEnded': return [{ wait: 200, sound: event.result.winnerIds.includes(me) ? 'win' : 'lose', apply: (d) => ({ ...d, view: { ...d.view, phase: 'finished', result: event.result } }) }];
  }
}

export const PETR_SCRIPT: GameScript<'petr', PetrDisplay, PetrClientEvent> = { gameId: 'petr', startedType: 'petrStarted', reconcile: reconcilePetr, steps: petrSteps };
