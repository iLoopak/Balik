import type { DurakClientEvent, DurakView } from '@balik/shared';
import { sortHand, type CardEntity } from '../../table/display';
import type { GameScript, GameStep } from '../useGameDirector';
import { entity, knownEntities, reconcileHands, takeFromHand } from '../entities';

export interface DurakDisplay {
  view: DurakView;
  hands: Record<string, CardEntity[]>;
  table: { attack: CardEntity; defense: CardEntity | null }[];
  trump: CardEntity | null;
  outgoing: CardEntity[];
  stamp: number;
  banner: string | null;
}
type Step = GameStep<DurakDisplay>;
const bump = (d: DurakDisplay) => ({ ...d, stamp: d.stamp + 1 });

export function reconcileDurak(view: DurakView, me: string, prev?: DurakDisplay): DurakDisplay {
  const known = knownEntities(...Object.values(prev?.hands ?? {}), prev?.table.flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])]), prev?.trump ? [prev.trump] : []);
  const stamp = (prev?.stamp ?? 0) + 1;
  const trumpInTalon = view.talonCount > 0;
  return {
    view, stamp, outgoing: [], banner: prev?.banner ?? null,
    hands: reconcileHands(view.players, me, view.myHand, prev?.hands, known, stamp, 'durak'),
    table: view.table.map((p) => ({ attack: known.get(p.attack.id) ?? entity(p.attack, stamp), defense: p.defense ? known.get(p.defense.id) ?? entity(p.defense, stamp) : null })),
    trump: trumpInTalon ? known.get(view.trumpCard.id) ?? entity(view.trumpCard, stamp) : null,
  };
}
const addToHand = (d: DurakDisplay, id: string, me: string, cards: CardEntity[]) => {
  const hand = [...(d.hands[id] ?? []), ...cards];
  return { ...d.hands, [id]: id === me ? sortHand(hand) : hand };
};

export function durakSteps(event: DurakClientEvent, me: string, target: DurakView): Step[] {
  switch (event.type) {
    case 'durakStarted': {
      let own = 0;
      const empty: DurakView = { ...target, myHand: [], table: [], talonCount: 32, discardCount: 0, finishOrder: [], phase: 'playing', result: null, winnerId: null,
        players: target.players.map((p) => ({ ...p, handCount: 0, out: false })) };
      return [
        { wait: 0, environment: { kind: 'deal' }, apply: (d) => ({ ...reconcileDurak(empty, me), trump: null, stamp: d.stamp + 1, banner: null }) },
        ...event.dealOrder.map((id): Step => {
          const card = id === me ? event.myCards[own++]! : null;
          return { wait: 60, sound: 'deal', apply: (d) => { const s = bump(d); return { ...s, hands: addToHand(s, id, me, [entity(card, s.stamp, { move: 'deal', spawn: { kind: 'deck' } }, 'durak')]), view: { ...s.view, talonCount: s.view.talonCount - 1 } }; } };
        }),
        { wait: 420, sound: 'special', apply: (d) => { const s = bump(d); return { ...s, trump: entity(event.trumpCard, s.stamp, { move: 'flipStart', spawn: { kind: 'deck' } }) }; } },
      ];
    }
    case 'durakBout': return [{ wait: 0, apply: (d) => ({ ...d, banner: null, view: { ...d.view, attackerId: event.attackerId, defenderId: event.defenderId, limit: event.limit, table: [] } }) }];
    case 'durakAttacked':
    case 'durakDefended': return [{ wait: 480, sound: 'play', environment: { kind: 'play', sourcePlayerId: event.playerId }, apply: (d) => {
      const s = bump(d);
      const { rest, taken } = takeFromHand(s.hands[event.playerId] ?? [], event.card, event.playerId === me);
      const played = { ...(taken ?? entity(event.card, s.stamp)), card: event.card, move: 'play' as const, moveStamp: s.stamp, spawn: taken ? null : { kind: 'seat' as const, playerId: event.playerId, index: 0, count: 1 } };
      const table = event.type === 'durakAttacked' ? [...s.table, { attack: played, defense: null }] : s.table.map((p, i) => i === event.index ? { ...p, defense: played } : p);
      const vTable = event.type === 'durakAttacked' ? [...s.view.table, { attack: event.card, defense: null }] : s.view.table.map((p, i) => i === event.index ? { ...p, defense: event.card } : p);
      return { ...s, hands: { ...s.hands, [event.playerId]: rest }, table, view: { ...s.view, table: vTable } };
    } }];
    case 'durakPassed': return [{ wait: 220, apply: (d) => d }];
    case 'durakTook': return [{ wait: 720, sound: 'draw', environment: { kind: 'collect', targetPlayerId: event.playerId }, apply: (d) => {
      const s = bump(d);
      const cards = s.table.flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])]).map((e) => ({ ...e, move: 'draw' as const, moveStamp: s.stamp, card: event.playerId === me ? e.card : null }));
      return { ...s, table: [], banner: null, hands: addToHand(s, event.playerId, me, cards), view: { ...s.view, table: [] } };
    } }];
    case 'durakBito': return [
      { wait: 520, sound: 'special', environment: { kind: 'collect' }, apply: (d) => { const s = bump(d); return { ...s, table: [], outgoing: s.table.flatMap((p) => [p.attack, ...(p.defense ? [p.defense] : [])]).map((e) => ({ ...e, move: 'toDeck' as const, moveStamp: s.stamp })), view: { ...s.view, table: [], discardCount: s.view.discardCount + event.count } }; } },
      { wait: 0, apply: (d) => ({ ...d, outgoing: [] }) },
    ];
    case 'durakDrawn': return [{ wait: 160 + event.count * 60, sound: 'deal', environment: { kind: 'draw', targetPlayerId: event.playerId }, apply: (d) => {
      const s = bump(d);
      const cards: CardEntity[] = Array.from({ length: event.count }, (_, i) => {
        const card = event.cards?.[i] ?? null;
        // The face-up trump is the last card of the talon.
        if (event.trumpDrawn && i === event.count - 1 && s.trump) return { ...s.trump, card: event.playerId === me ? card : null, move: 'draw' as const, moveStamp: s.stamp, delay: i * .06 };
        return entity(event.playerId === me ? card : null, s.stamp, { move: 'draw', spawn: { kind: 'deck' }, delay: i * .06 }, 'durak');
      });
      return { ...s, trump: event.trumpDrawn ? null : s.trump, hands: addToHand(s, event.playerId, me, cards), view: { ...s.view, talonCount: Math.max(0, s.view.talonCount - event.count) } };
    } }];
    case 'durakOut': return [{ wait: 600, sound: 'special', apply: (d) => ({ ...d, view: { ...d.view, finishOrder: [...d.view.finishOrder, event.playerId], players: d.view.players.map((p) => p.id === event.playerId ? { ...p, out: true } : p) } }) }];
    case 'durakTurn': return [{ wait: 0, apply: (d) => ({ ...d, view: { ...d.view, currentPlayerId: event.playerId, role: event.role } }) }];
    case 'durakEnded': return [{ wait: 200, sound: event.result.winnerIds.includes(me) ? 'win' : 'lose', apply: (d) => ({ ...d, view: { ...d.view, phase: 'finished', result: event.result } }) }];
  }
}

export const DURAK_SCRIPT: GameScript<'durak', DurakDisplay, DurakClientEvent> = { gameId: 'durak', startedType: 'durakStarted', reconcile: reconcileDurak, steps: durakSteps };
