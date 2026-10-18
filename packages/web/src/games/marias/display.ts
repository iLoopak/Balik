import type { Card, MariasClientEvent, MariasView } from '@balik/shared';
import { sortHand, type CardEntity } from '../../table/display';
import type { GameScript, GameStep } from '../useGameDirector';
import { entity, knownEntities, reconcileHands, takeFromHand } from '../entities';

export interface MariasDisplay {
  view: MariasView;
  hands: Record<string, CardEntity[]>;
  trick: { playerId: string; entity: CardEntity }[];
  talon: CardEntity[];
  outgoing: CardEntity[];
  captureTo: string | null;
  stamp: number;
  banner: string | null;
}
type Step = GameStep<MariasDisplay>;
const bump = (d: MariasDisplay) => ({ ...d, stamp: d.stamp + 1 });
export const CONTRACT_NAME = { hra: 'Hra', betl: 'Betl', durch: 'Durch' } as const;

export function reconcileMarias(view: MariasView, me: string, prev?: MariasDisplay): MariasDisplay {
  const known = knownEntities(...Object.values(prev?.hands ?? {}), prev?.trick.map((p) => p.entity), prev?.talon);
  const stamp = (prev?.stamp ?? 0) + 1;
  const keptTalon = (prev?.talon ?? []).slice(0, view.talonCount);
  while (keptTalon.length < view.talonCount) keptTalon.push(entity(null, stamp, {}, 'marias-talon'));
  return {
    view, stamp, outgoing: [], captureTo: null, banner: prev?.banner ?? null, talon: keptTalon,
    hands: reconcileHands(view.players, me, view.myHand, prev?.hands, known, stamp, 'marias'),
    trick: view.trick.map((p) => ({ playerId: p.playerId, entity: known.get(p.card.id) ?? entity(p.card, stamp) })),
  };
}
const addToHand = (d: MariasDisplay, id: string, me: string, cards: CardEntity[]) => {
  const hand = [...(d.hands[id] ?? []), ...cards];
  return { ...d.hands, [id]: id === me ? sortHand(hand) : hand };
};

export function mariasSteps(event: MariasClientEvent, me: string, target: MariasView): Step[] {
  switch (event.type) {
    case 'mariasStarted': {
      const empty: MariasView = { ...target, myHand: [], trick: [], talonCount: 0, talon: null, trump: null, trumpCard: null, contract: null, phase: 'choosingTrump', result: null, winnerId: null, marriages: [], lastTrick: null,
        declarerId: event.declarerId, players: target.players.map((p) => ({ ...p, handCount: 0, points: 0, tricks: 0 })) };
      return [
        { wait: 0, environment: { kind: 'deal' }, apply: (d) => ({ ...reconcileMarias(empty, me), talon: [], stamp: d.stamp + 1, banner: null }) },
        ...Array.from({ length: event.firstCount }, (_, i): Step => ({ wait: 70, sound: 'deal', apply: (d) => {
          const s = bump(d);
          return { ...s, hands: addToHand(s, event.declarerId, me, [entity(event.first?.[i] ?? null, s.stamp, { move: 'deal', spawn: { kind: 'deck' } }, 'marias')]) };
        } })),
      ];
    }
    case 'mariasTrump': return [{ wait: 900, sound: 'special', environment: { kind: 'suit' }, apply: (d) => ({ ...d, banner: `Trumf ukázán`, view: { ...d.view, trump: event.card.suit, trumpCard: event.card, phase: 'declaring' } }) }];
    case 'mariasDealt': {
      const order = Object.entries(event.counts).flatMap(([id, n]) => Array.from({ length: n }, (_, i) => ({ id, i })));
      return order.map(({ id, i }): Step => ({ wait: 45, sound: 'deal', apply: (d) => {
        const s = bump(d);
        return { ...s, hands: addToHand(s, id, me, [entity(id === me ? event.myCards[i] ?? null : null, s.stamp, { move: 'deal', spawn: { kind: 'deck' } }, 'marias')]) };
      } }));
    }
    case 'mariasDeclared': return [{ wait: 900, sound: 'special', apply: (d) => {
      const s = bump(d);
      let hand = s.hands[event.playerId] ?? [];
      const laid: CardEntity[] = [];
      for (let i = 0; i < event.discardCount; i++) {
        const card: Card | null = event.discard?.[i] ?? null;
        const { rest, taken } = takeFromHand(hand, card, event.playerId === me);
        hand = rest;
        if (taken) laid.push({ ...taken, card: null, key: taken.key, move: 'toDeck', moveStamp: s.stamp });
      }
      return { ...s, hands: { ...s.hands, [event.playerId]: hand }, talon: laid, banner: CONTRACT_NAME[event.contract], view: { ...s.view, contract: event.contract, phase: 'playing', talonCount: event.discardCount } };
    } }];
    case 'mariasPlayed': return [{ wait: event.marriage ? 760 : 480, sound: event.marriage ? 'special' : 'play', environment: { kind: 'play', sourcePlayerId: event.playerId }, apply: (d) => {
      const s = bump(d);
      const { rest, taken } = takeFromHand(s.hands[event.playerId] ?? [], event.card, event.playerId === me);
      const played = { ...(taken ?? entity(event.card, s.stamp)), card: event.card, move: 'play' as const, moveStamp: s.stamp, spawn: taken ? null : { kind: 'seat' as const, playerId: event.playerId, index: 0, count: 1 } };
      return { ...s, hands: { ...s.hands, [event.playerId]: rest }, trick: [...s.trick, { playerId: event.playerId, entity: played }],
        banner: event.marriage ? `Hláška ${event.marriage.points}` : null,
        view: { ...s.view, trick: [...s.view.trick, { playerId: event.playerId, card: event.card }], marriages: event.marriage ? [...s.view.marriages, { playerId: event.playerId, ...event.marriage }] : s.view.marriages,
          players: event.marriage ? s.view.players.map((p) => p.id === event.playerId ? { ...p, points: p.points + event.marriage!.points } : p) : s.view.players } };
    } }];
    case 'mariasTrick': return [
      { wait: 420, apply: (d) => d },
      { wait: 440, sound: 'draw', environment: { kind: 'collect', targetPlayerId: event.winnerId }, apply: (d) => {
        const s = bump(d);
        return { ...s, captureTo: event.winnerId, trick: [], outgoing: s.trick.map((p) => ({ ...p.entity, move: 'toDeck' as const, moveStamp: s.stamp })),
          view: { ...s.view, trick: [], leaderId: event.winnerId, lastTrick: { winnerId: event.winnerId, cards: event.cards },
            players: s.view.players.map((p) => ({ ...p, points: event.points[p.id] ?? p.points, tricks: p.tricks + (p.id === event.winnerId ? 1 : 0) })) } };
      } },
      { wait: 0, apply: (d) => ({ ...d, outgoing: [], captureTo: null }) },
    ];
    case 'mariasTurn': return [{ wait: 0, apply: (d) => ({ ...d, view: { ...d.view, currentPlayerId: event.playerId } }) }];
    case 'mariasEnded': return [{ wait: 200, sound: event.result.winnerIds.includes(me) ? 'win' : 'lose', apply: (d) => ({ ...d, banner: null, view: { ...d.view, phase: 'finished', result: event.result, talon: event.talon } }) }];
  }
}

export const MARIAS_SCRIPT: GameScript<'marias', MariasDisplay, MariasClientEvent> = { gameId: 'marias', startedType: 'mariasStarted', reconcile: reconcileMarias, steps: mariasSteps };
