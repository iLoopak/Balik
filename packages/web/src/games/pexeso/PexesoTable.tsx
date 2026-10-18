import { useEffect, useState } from 'react';
import { pexesoLegalFromView, type PexesoClientEvent, type PexesoView, type RoomView } from '@balik/shared';
import { plural } from '../../lib/format';
import { sendAction } from '../../net/client';
import { useApp } from '../../net/store';
import type { CardEntity } from '../../table/display';
import type { Geometry, PlacedCard } from '../../table/layout';
import { usePerfLite } from '../../table/usePerfLite';
import { entity } from '../entities';
import { GameShell, useGameGeometry } from '../GameShell';
import { useGameDirector, type GameScript, type GameStep } from '../useGameDirector';

interface PexesoDisplay { view: PexesoView; slots: (CardEntity | null)[]; outgoing: CardEntity[]; captureTo: string | null; stamp: number }
type Step = GameStep<PexesoDisplay>;
const slotKey = (i: number) => `pexeso-slot-${i}`;

/** Slots keep one key each: turning a card is a flip of the same entity, never a remount. */
function reconcile(view: PexesoView, _me: string, prev?: PexesoDisplay): PexesoDisplay {
  const stamp = (prev?.stamp ?? 0) + 1;
  const slots = view.board.map((s, i) => s.state === 'gone' ? null : { ...(prev?.slots[i] ?? entity(null, stamp, { key: slotKey(i) })), key: slotKey(i), card: s.state === 'up' ? s.card : null });
  return { view, slots, outgoing: [], captureTo: null, stamp };
}
function steps(event: PexesoClientEvent, me: string, target: PexesoView): Step[] {
  switch (event.type) {
    case 'pexesoStarted': return [
      // A board already on the table (joined from the snapshot) is not dealt again: same keys must not unmount and remount.
      { wait: 0, environment: { kind: 'deal' }, apply: (d) => ({ ...d, stamp: d.stamp + 1, slots: d.slots.length === event.count && d.slots.every(Boolean) ? d.slots.map((e) => e && { ...e, card: null }) : Array.from({ length: event.count }, () => null), view: { ...target, phase: 'playing', result: null, players: target.players.map((p) => ({ ...p, pairs: 0 })) } }) },
      ...Array.from({ length: event.count }, (_, i): Step => ({ wait: 22, sound: i % 4 ? undefined : 'deal', apply: (d) => {
        if (d.slots[i]) return d;
        const s = { ...d, stamp: d.stamp + 1 };
        const slots = [...s.slots]; slots[i] = entity(null, s.stamp, { key: slotKey(i), move: 'deal', spawn: { kind: 'deck' } });
        return { ...s, slots };
      } })),
    ];
    case 'pexesoFlipped': return [{ wait: 460, sound: 'select', apply: (d) => {
      const s = { ...d, stamp: d.stamp + 1 };
      const slots = [...s.slots]; const e = slots[event.index];
      if (e) slots[event.index] = { ...e, card: event.card, move: 'flipStart', moveStamp: s.stamp };
      return { ...s, slots };
    } }];
    case 'pexesoMatch': return [
      { wait: 520, sound: 'special', environment: { kind: 'collect', targetPlayerId: event.playerId }, apply: (d) => {
        const s = { ...d, stamp: d.stamp + 1 };
        const slots = [...s.slots];
        const taken = event.indices.flatMap((i) => { const e = slots[i]; slots[i] = null; return e ? [{ ...e, move: 'toDeck' as const, moveStamp: s.stamp }] : []; });
        return { ...s, slots, outgoing: taken, captureTo: event.playerId, view: { ...s.view, players: s.view.players.map((p) => p.id === event.playerId ? { ...p, pairs: p.pairs + 1 } : p) } };
      } },
      { wait: 0, apply: (d) => ({ ...d, outgoing: [], captureTo: null }) },
    ];
    // A miss stays visible long enough to remember, then both cards turn back.
    case 'pexesoMiss': return [{ wait: 900, apply: (d) => d }, { wait: 360, sound: 'draw', apply: (d) => {
      const s = { ...d, stamp: d.stamp + 1 };
      const slots = [...s.slots];
      for (const i of event.indices) { const e = slots[i]; if (e) slots[i] = { ...e, card: null, move: null, moveStamp: s.stamp }; }
      return { ...s, slots, view: { ...s.view, turns: s.view.turns + 1 } };
    } }];
    case 'pexesoTurn': return [{ wait: 0, apply: (d) => ({ ...d, view: { ...d.view, currentPlayerId: event.playerId } }) }];
    case 'pexesoEnded': return [{ wait: 200, sound: event.result.winnerIds.includes(me) ? 'win' : 'lose', apply: (d) => ({ ...d, view: { ...d.view, phase: 'finished', result: event.result, turns: event.result.turns } }) }];
  }
}
const SCRIPT: GameScript<'pexeso', PexesoDisplay, PexesoClientEvent> = { gameId: 'pexeso', startedType: 'pexesoStarted', reconcile, steps };

/** No hand: the control bar moves to the bottom and the grid takes the rest. */
function pexesoGeometry(g: Geometry): Geometry {
  const controlY = g.h - g.controlHeight - (g.compact ? 10 : 16);
  return { ...g, controlY, handTop: g.h, handY: g.h + g.cardH };
}
function grid(geo: Geometry, opponents: number) {
  const top = opponents ? geo.seats[Object.keys(geo.seats)[0]!]!.y + geo.cardH * geo.oppScale * .56 + 56 : 14;
  const bottom = geo.controlY - 10, left = 10, right = geo.w - 10;
  const w = right - left, h = Math.max(80, bottom - top);
  const layouts = [[8, 4], [4, 8]] as const;
  const fit = layouts.map(([c, r]) => ({ c, r, cw: Math.min((w / c) * .9, ((h / r) * .9) / 1.4) })).sort((a, b) => b.cw - a.cw)[0]!;
  return { ...fit, left, top, w, h };
}

export function PexesoTable({ room, reducedMotion }: { room: RoomView<'pexeso'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const { display, idle, environment } = useGameDirector(room, SCRIPT, reducedMotion || lite);
  useEffect(() => setBusy(!idle), [idle]);
  const me = room.you, view = display.view, truth = room.game!;
  const pending = useApp((s) => s.pending), status = useApp((s) => s.status);
  const { ref, geo } = useGameGeometry(view.players.map((p) => p.id), me, 0, pexesoGeometry);
  const canAct = idle && !pending && status === 'open' && truth.phase === 'playing' && truth.currentPlayerId === me;
  const legal = new Set((canAct ? pexesoLegalFromView(truth, me) : []).map((a) => slotKey(a.index)));
  const name = (id: string) => id === me ? 'Ty' : room.players.find((p) => p.id === id)?.name ?? 'Hráč';
  const g = grid(geo, Object.keys(geo.seats).length);
  const scale = g.cw / geo.cardW;
  const placed: PlacedCard[] = display.slots.flatMap((e, i) => {
    if (!e) return [];
    const col = i % g.c, row = Math.floor(i / g.c);
    const x = g.left + (col + .5) * (g.w / g.c), y = g.top + (row + .5) * (g.h / g.r);
    return [{ entity: e, zone: 'discard' as const, place: { x, y, rotate: 0, scale, faceUp: !!e.card, z: 100 + i } }];
  });
  const target = display.captureTo === me ? { x: geo.w / 2, y: geo.h + geo.cardH } : geo.seats[display.captureTo ?? ''] ?? { x: geo.w / 2, y: -geo.cardH };
  display.outgoing.forEach((e, i) => placed.push({ entity: { ...e, card: e.card }, zone: 'outgoing', place: { x: target.x, y: target.y, rotate: i * 6, scale: scale * .6, faceUp: true, z: 450 + i } }));
  const mine = view.players.find((p) => p.id === me);
  const solo = view.players.length === 1;
  const result = view.result;
  return <GameShell room={room} gameId="pexeso" tableRef={ref} geo={geo} placed={placed} stamp={display.stamp} lite={lite} reducedMotion={reducedMotion} apparatus={false}
    fxFor={(p) => legal.has(p.entity.key) ? { playable: true } : undefined}
    interactive={(p) => legal.has(p.entity.key)} hovered={null} onHover={() => {}} onActivate={(key) => { if (legal.has(key)) sendAction({ type: 'pexesoFlip', index: Number(key.slice('pexeso-slot-'.length)) }); }}
    environment={environment} myTurn={canAct} activeId={view.phase === 'playing' ? view.currentPlayerId : null}
    seatInfo={(id) => { const p = view.players.find((x) => x.id === id); return { sub: p ? plural(p.pairs, 'dvojice', 'dvojice', 'dvojic') : undefined }; }}
    top={<>
      {view.players.map((p) => <span key={p.id} className={`game-score${p.id === view.currentPlayerId ? ' is-current' : ''}`}><b>{p.pairs}</b><small>{name(p.id)}</small></span>)}
      <span className="game-score"><b>{16 - view.players.reduce((n, p) => n + p.pairs, 0)}</b><small>zbývá dvojic</small></span>
      {solo && <span className="game-score"><b>{view.turns}</b><small>tahů</small></span>}
    </>}
    controls={{
      title: view.phase === 'finished' ? 'Konec hry' : !idle ? 'Karty se otáčejí…' : canAct ? 'Otoč kartu' : `${name(view.currentPlayerId)} otáčí`,
      sub: `Dvojice: stejná hodnota a barva (červená, nebo černá)${mine ? ` · máš ${plural(mine.pairs, 'dvojici', 'dvojice', 'dvojic')}` : ''}`,
    }}
    outcome={result ? { winnerIds: result.winnerIds,
      title: solo ? `Hotovo za ${plural(result.turns, 'tah', 'tahy', 'tahů')}.` : result.winnerIds.length > 1 ? `Shoda: ${result.winnerIds.map(name).join(' a ')}.` : result.winnerIds[0] === me ? 'Nejvíc dvojic máš ty.' : `${name(result.winnerIds[0] ?? '')} má nejvíc dvojic.`,
      note: view.players.map((p) => `${name(p.id)} ${result.pairs[p.id] ?? 0}`).join(' · ') } : null}
    finished={view.phase === 'finished'} idle={idle} />;
}
