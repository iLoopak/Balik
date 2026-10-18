import type { Card, OkoClientEvent, OkoView } from '@balik/shared';
import type { CardEntity } from '../../table/display';
import type { GameScript, GameStep } from '../useGameDirector';
import { entity, knownEntities } from '../entities';

export interface OkoDisplay {
  view: OkoView;
  hands: Record<string, CardEntity[]>;
  outgoing: CardEntity[];
  stamp: number;
  banner: string | null;
}
type Step = GameStep<OkoDisplay>;
const bump = (d: OkoDisplay) => ({ ...d, stamp: d.stamp + 1 });

/** Hands keep draw order (no sorting): the reveal lists cards in the same order. */
export function reconcileOko(view: OkoView, me: string, prev?: OkoDisplay): OkoDisplay {
  const known = knownEntities(...Object.values(prev?.hands ?? {}));
  const stamp = (prev?.stamp ?? 0) + 1;
  const hands = Object.fromEntries(view.players.map((p) => {
    const faces: (Card | null)[] = p.id === me ? view.myHand ?? [] : p.revealed ?? Array.from({ length: p.handCount }, () => null);
    const old = prev?.hands[p.id] ?? [];
    return [p.id, faces.map((c, i) => (c && known.get(c.id)) ?? (old[i] ? { ...old[i]!, card: c } : entity(c, stamp, {}, 'oko')))];
  }));
  return { view, stamp, hands, outgoing: [], banner: prev?.banner ?? null };
}

const reveal = (d: OkoDisplay, playerId: string, cards: Card[]) => ({ ...d.hands, [playerId]: (d.hands[playerId] ?? []).map((e, i) => cards[i] ? { ...e, card: cards[i]!, move: 'play' as const, moveStamp: d.stamp } : e) });
const OUTCOME = { win: 'Vyhráváš proti bankéři', lose: 'Bankéř tě porazil', push: 'Remíza s bankéřem' } as const;

export function okoSteps(event: OkoClientEvent, me: string, target: OkoView, name: (id: string) => string = (id) => id): Step[] {
  switch (event.type) {
    case 'okoHand': {
      let own = 0;
      return [
        { wait: 420, sound: 'draw', environment: { kind: 'collect' }, apply: (d) => { const s = bump(d); return { ...s, banner: null, outgoing: Object.values(s.hands).flat().map((e) => ({ ...e, move: 'toDeck' as const, moveStamp: s.stamp })),
          hands: Object.fromEntries(Object.keys(s.hands).map((id) => [id, []])),
          view: { ...s.view, hand: event.hand, bankId: event.bankId, players: s.view.players.map((p) => ({ ...p, handCount: 0, status: 'waiting' as const, revealed: null })), myHand: [], myTotal: 0 } }; } },
        { wait: 0, environment: { kind: 'deal' }, apply: (d) => ({ ...d, outgoing: [] }) },
        ...event.dealOrder.map((id): Step => {
          const card = id === me ? event.myCards[own++]! : null;
          return { wait: 140, sound: 'deal', apply: (d) => { const s = bump(d); return { ...s, hands: { ...s.hands, [id]: [...(s.hands[id] ?? []), entity(card, s.stamp, { move: 'deal', spawn: { kind: 'deck' } }, 'oko')] } }; } };
        }),
      ];
    }
    case 'okoDrew': return [{ wait: event.revealed ? 760 : 420, sound: event.status === 'bust' ? 'reaction' : event.status === 'oko' ? 'special' : 'deal', environment: { kind: 'draw', targetPlayerId: event.playerId }, apply: (d) => {
      const s = bump(d);
      const added = entity(event.playerId === me ? event.card ?? null : null, s.stamp, { move: 'draw', spawn: { kind: 'deck' } }, 'oko');
      const withCard = { ...s, hands: { ...s.hands, [event.playerId]: [...(s.hands[event.playerId] ?? []), added] } };
      return { ...withCard, hands: event.revealed ? reveal(withCard, event.playerId, event.revealed) : withCard.hands,
        banner: event.status === 'bust' ? `${name(event.playerId)}: přes 21` : event.status === 'oko' ? `${name(event.playerId)} má oko!` : s.banner,
        view: { ...s.view, players: s.view.players.map((p) => p.id === event.playerId ? { ...p, handCount: p.handCount + 1, status: event.status, revealed: event.revealed } : p) } };
    } }];
    case 'okoStood': return [{ wait: 260, apply: (d) => ({ ...d, view: { ...d.view, players: d.view.players.map((p) => p.id === event.playerId ? { ...p, status: 'stood' as const } : p) } }) }];
    case 'okoTurn': return [{ wait: 0, apply: (d) => ({ ...d, view: { ...d.view, currentPlayerId: event.playerId, players: d.view.players.map((p) => p.id === event.playerId && p.status === 'waiting' ? { ...p, status: 'playing' as const } : p) } }) }];
    case 'okoResolved': return [{ wait: 2200, sound: 'special', apply: (d) => {
      const s = bump(d);
      let hands = s.hands;
      for (const [id, cards] of Object.entries(event.result.hands)) hands = reveal({ ...s, hands }, id, cards);
      const mine = event.result.outcome[me];
      return { ...s, hands, banner: me === event.result.bankId ? `Bankéř bere ${event.result.points[me] ?? 0}` : mine ? OUTCOME[mine] : null,
        view: { ...s.view, lastHand: event.result, players: s.view.players.map((p) => ({ ...p, score: event.scores[p.id] ?? p.score })) } };
    } }];
    case 'okoEnded': return [{ wait: 200, sound: event.result.winnerIds.includes(me) ? 'win' : 'lose', apply: (d) => ({ ...d, view: { ...d.view, phase: 'finished', result: event.result } }) }];
  }
}

export const okoScript = (name: (id: string) => string): GameScript<'oko', OkoDisplay, OkoClientEvent> => ({ gameId: 'oko', startedType: 'okoHand', reconcile: reconcileOko, steps: (e, me, t) => okoSteps(e, me, t, name) });
