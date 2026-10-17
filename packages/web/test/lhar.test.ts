import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  applyLharAction,
  createDeck32,
  createLharRound,
  filterLharEventFor,
  lharViewFor,
  mulberry32,
  type LharClientEvent,
  type LharState,
} from '@balik/shared';
import { lharSteps, reconcileLhar, type LharDisplay } from '../src/lhar/display';
import { placeLhar } from '../src/lhar/layout';
import { computeGeometry } from '../src/table/layout';
import { CardView } from '../src/cards/Card';
import { inspectLharFrame } from '../src/lhar/ordering';
import { BrandResults } from '../src/brand/BrandResults';
function state() {
  const s = createLharRound(['a', 'b'], 0, mulberry32(1)).state,
    deck = createDeck32();
  s.players[0]!.hand = deck.filter((c) => c.id === 'hearts-7' || c.id === 'hearts-8');
  s.players[1]!.hand = deck.filter((c) => !s.players[0]!.hand.some((a) => a.id === c.id));
  return s;
}
function replay(d: LharDisplay, events: LharClientEvent[], target: ReturnType<typeof lharViewFor>, me = 'a') {
  const frames: LharDisplay[] = [];
  for (const ev of events)
    for (const step of lharSteps(ev, me, target)) {
      d = step.apply(d);
      frames.push(d);
    }
  return { display: d, frames };
}
function move(s: LharState, who: string, action: Parameters<typeof applyLharAction>[2]) {
  const r = applyLharAction(s, who, action);
  if (!r.ok) throw Error(r.error);
  return r;
}
describe('Lhář event-driven presentation', () => {
  it('moves the same selected elements face down; only the challenged batch flips and the same keys return to hand', () => {
    let s = state(),
      d = reconcileLhar(lharViewFor(s, 'a'), 'a');
    const key = d.hands.a!.find((e) => e.card?.id === 'hearts-8')!.key;
    let r = move(s, 'a', { type: 'lharPlay', cardIds: ['hearts-8'], declaredRank: '7' });
    s = r.state;
    d = replay(
      d,
      r.events.map((e) => filterLharEventFor(e, 'a')),
      lharViewFor(s, 'a'),
    ).display;
    expect(d.pile[0]!.entity.key).toBe(key);
    expect(d.hands.a).toHaveLength(1);
    expect(d.beat).toBe('quiet');
    const geo = computeGeometry(390, 600, ['a', 'b'], 'a', 1),
      ui = { hovered: null, selected: null, pendingKey: null, playable: new Set<string>(), myTurn: false };
    const before = placeLhar(d, geo, 'a', ui, new Set()).find((p) => p.entity.key === key)!;
    expect(before.place.faceUp).toBe(false);
    const html = renderToStaticMarkup(
      createElement(CardView, {
        card: before.entity.card,
        faceUp: before.place.faceUp,
        deck: 'retro-arcade',
        game: 'lhar',
      }),
    );
    expect(html).not.toContain('/stickers/');
    expect(html).not.toContain('card-front');
    expect(html).toContain('rub karty');
    r = move(s, 'b', { type: 'lharChallenge', claimId: 1 });
    s = r.state;
    const replayed = replay(
      d,
      r.events.map((e) => filterLharEventFor(e, 'a')),
      lharViewFor(s, 'a'),
    );
    const quiet = replayed.frames.find((f) => f.beat === 'challenge')!,
      reveal = replayed.frames.find((f) => f.beat === 'reveal')!;
    expect(placeLhar(quiet, geo, 'a', ui, new Set()).find((p) => p.entity.key === key)!.place.faceUp).toBe(
      false,
    );
    expect(placeLhar(reveal, geo, 'a', ui, new Set()).find((p) => p.entity.key === key)!.place.faceUp).toBe(
      true,
    );
    expect(reveal.resolution).toMatchObject({ truthful: false, collectorId: 'a', pileCount: 1 });
    d = replayed.display;
    expect(d.pile).toEqual([]);
    expect(d.hands.a!.find((e) => e.card?.id === 'hearts-8')!.key).toBe(key);
  });
  it('uses only anonymous local entities for opponent hidden plays, no back asset depends on a card', () => {
    const s = state(),
      r = move(s, 'a', { type: 'lharPlay', cardIds: ['hearts-8'], declaredRank: '7' }),
      view = lharViewFor(r.state, 'b');
    const d = replay(
      reconcileLhar(lharViewFor(s, 'b'), 'b'),
      r.events.map((e) => filterLharEventFor(e, 'b')),
      view,
      'b',
    ).display;
    expect(d.pile[0]!.entity.card).toBeNull();
    expect(d.pile[0]!.entity.key).toMatch(/^lhar-hidden-/);
    expect(JSON.stringify(d.pile)).not.toContain('hearts-8');
    const reconnect = reconcileLhar(view, 'b');
    expect(reconnect.beat).toBe('quiet');
    expect(reconnect.resolution).toBeNull();
    expect(reconnect.pile.every((p) => p.entity.card === null)).toBe(true);
  });
  it('ignores a delayed reveal/take for another claim and never replays the last resolution on reconnect', () => {
    let s = state();
    s = move(s, 'a', { type: 'lharPlay', cardIds: ['hearts-8'], declaredRank: '7' }).state;
    const resolved = move(s, 'b', { type: 'lharChallenge', claimId: 1 });
    const d = reconcileLhar(lharViewFor(resolved.state, 'a'), 'a');
    const out = replay(
      d,
      resolved.events.map((e) => filterLharEventFor(e, 'a')),
      lharViewFor(resolved.state, 'a'),
    ).frames;
    expect(out.every((f) => f.beat === 'quiet' && f.resolution === null)).toBe(true);
    const next = move(resolved.state, 'b', {
      type: 'lharPlay',
      cardIds: [resolved.state.players[1]!.hand[0]!.id],
      declaredRank: '7',
    });
    const newer = reconcileLhar(lharViewFor(next.state, 'a'), 'a');
    for (const ev of resolved.events.filter((e) => e.type === 'lharResolved' || e.type === 'lharTaken'))
      for (const step of lharSteps(filterLharEventFor(ev, 'a'), 'a', lharViewFor(next.state, 'a')))
        expect(step.apply(newer)).toBe(newer);
  });
  it('keeps up to 32 hand cards and 1–4 revealed cards inside desktop/mobile geometry with unique keys', () => {
    const s = createLharRound(['a', 'b', 'c', 'd'], 0, mulberry32(8)).state;
    // Stress: a large hand plus a complete four-card challenge reveal; other hands remain hidden.
    s.players[0]!.hand = createDeck32();
    let d = reconcileLhar(lharViewFor(s, 'a'), 'a');
    d = {
      ...d,
      beat: 'reveal',
      resolution: {
        claim: { id: 1, playerId: 'b', rank: '7', count: 4 },
        challengerId: 'a',
        truthful: false,
        revealed: createDeck32().slice(0, 4),
        collectorId: 'b',
        pileCount: 4,
      },
      pile: createDeck32()
        .slice(0, 4)
        .map((c, i) => ({
          claimId: 1,
          entity: {
            key: `reveal-${i}`,
            card: c,
            move: null,
            moveStamp: d.stamp,
            spawn: null,
            delay: 0,
            flash: null,
          },
        })),
    };
    for (const [w, h] of [
      [320, 380],
      [390, 600],
      [844, 280],
      [1280, 600],
      [1920, 900],
    ]) {
      const geo = computeGeometry(
          w!,
          h!,
          s.players.map((p) => p.id),
          'a',
          32,
        ),
        placed = placeLhar(
          d,
          geo,
          'a',
          { hovered: null, selected: null, pendingKey: null, playable: new Set(), myTurn: false },
          new Set(),
        );
      expect(new Set(placed.map((p) => p.entity.key)).size).toBe(placed.length);
      for (const p of placed.filter((p) => p.zone === 'mine' || p.zone === 'discard')) {
        const half = (geo.cardW * p.place.scale) / 2;
        expect(p.place.x - half).toBeGreaterThanOrEqual(-0.1);
        expect(p.place.x + half).toBeLessThanOrEqual(w! + 0.1);
        expect(p.place.y - (geo.cardH * p.place.scale) / 2).toBeGreaterThanOrEqual(0);
        expect(p.place.y + (geo.cardH * p.place.scale) / 2).toBeLessThanOrEqual(h! + 0.1);
      }
    }
  });
  it('does not print Prší/Sedma action hints in the classic Lhář face, and uses shared results for cancellation', () => {
    for (const rank of ['7', 'Q', 'A'] as const) {
      const card = createDeck32().find((c) => c.rank === rank)!;
      const html = renderToStaticMarkup(
        createElement(CardView, { card, faceUp: true, game: 'lhar', deck: 'classic' }),
      );
      expect(html).not.toContain('card-hint');
    }
    const s = createLharRound(['a', 'b', 'c'], 0, mulberry32(1)).state;
    s.phase = 'finished';
    s.result = { winnerIds: [], reason: 'forfeit' };
    const room = {
      code: 'ABCD',
      you: 'a',
      hostId: 'a',
      gameId: 'lhar' as const,
      status: 'finished' as const,
      round: 1,
      seq: 1,
      players: s.players.map((p) => ({ id: p.id, name: p.id, bot: false, connected: true, wins: 0 })),
      game: lharViewFor(s, 'a'),
    };
    const html = renderToStaticMarkup(
      createElement(BrandResults, {
        room,
        winnerId: null,
        pending: false,
        reduced: true,
        onRematch: () => {},
        onLobby: () => {},
        onLeave: () => {},
      }),
    );
    expect(html).toContain('Partie končí bez vítěze.');
    expect(html).toContain('Kontumace');
    expect(html).not.toContain('Dělíte se o balík.');
  });
});


it('drops stale round/sequence frames even with reset, and resets on missing or duplicate events',()=>{
  const cursor={round:2,seq:20};
  const event=(seq:number)=>({type:'lharTurn' as const,seq,playerId:'a',requiredRank:'7' as const});
  expect(inspectLharFrame(cursor,{round:1,seq:25},[event(21)],true).mode).toBe('ignore');
  expect(inspectLharFrame(cursor,{round:2,seq:19},[],true).mode).toBe('ignore');
  expect(inspectLharFrame(cursor,{round:2,seq:23},[event(21),event(23)],false).mode).toBe('reset');
  expect(inspectLharFrame(cursor,{round:2,seq:22},[event(21),event(21),event(22)],false).mode).toBe('reset');
  expect(inspectLharFrame(cursor,{round:2,seq:22},[event(21)],false).mode).toBe('reset');
  expect(inspectLharFrame(cursor,{round:3,seq:21},[event(21)],false).mode).toBe('reset');
  expect(inspectLharFrame(cursor,{round:2,seq:22},[event(21),event(22)],false).mode).toBe('append');
});
