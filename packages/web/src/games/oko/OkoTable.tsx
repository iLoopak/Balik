import { useEffect, useMemo, useState } from 'react';
import { okoLegalFromView, okoTotal, type OkoAction, type RoomView } from '@balik/shared';
import { CardBack } from '../../cards/Card';
import { plural } from '../../lib/format';
import { sendAction } from '../../net/client';
import { useApp } from '../../net/store';
import { placeMyHand, type Geometry, type PlacedCard } from '../../table/layout';
import { usePerfLite } from '../../table/usePerfLite';
import { GameShell, TableChip, useGameGeometry } from '../GameShell';
import { useGameDirector } from '../useGameDirector';
import { okoScript, type OkoDisplay } from './display';

const STATUS = { waiting: 'čeká', playing: 'hraje', stood: 'stojí', bust: 'přes 21', oko: 'oko!' } as const;

export function OkoTable({ room, reducedMotion }: { room: RoomView<'oko'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const me = room.you;
  const name = (id: string) => id === me ? 'Ty' : room.players.find((p) => p.id === id)?.name ?? 'Hráč';
  const script = useMemo(() => okoScript(name), [room.players, me]); // eslint-disable-line react-hooks/exhaustive-deps
  const { display, idle, environment } = useGameDirector(room, script, reducedMotion || lite);
  useEffect(() => setBusy(!idle), [idle]);
  const view = display.view, truth = room.game!;
  const pending = useApp((s) => s.pending), status = useApp((s) => s.status);
  const { ref, geo } = useGameGeometry(view.players.map((p) => p.id), me, Math.max(3, (display.hands[me] ?? []).length));
  const canAct = idle && !pending && status === 'open' && truth.phase === 'playing' && truth.currentPlayerId === me;
  const legal = canAct ? okoLegalFromView(truth, me) : [];
  const act = (action: OkoAction) => { sendAction(action); };
  const myCards = (display.hands[me] ?? []).flatMap((e) => e.card ? [e.card] : []);
  const total = okoTotal(myCards);
  const placed = placeOko(display, geo, me);
  const result = view.result;
  const bank = view.bankId;
  return <GameShell room={room} gameId="oko" tableRef={ref} geo={geo} placed={placed} stamp={display.stamp} lite={lite} reducedMotion={reducedMotion}
    fxFor={() => undefined} interactive={() => false} hovered={null} onHover={() => {}} onActivate={() => {}}
    environment={environment} drawCount={view.deckCount} myTurn={canAct} activeId={view.phase === 'playing' ? view.currentPlayerId : null}
    seatInfo={(id) => { const p = view.players.find((x) => x.id === id); return { sub: p ? `${STATUS[p.status]}${p.revealed ? ` · ${okoTotal(p.revealed)}` : ''}` : undefined, badge: id === bank ? 'bankéř' : undefined, tone: p?.status === 'bust' ? 'danger' : p?.status === 'oko' ? 'good' : undefined }; }}
    top={<>
      {view.players.map((p) => <span key={p.id} className={`game-score${p.id === view.currentPlayerId ? ' is-current' : ''}`}><b>{p.score}</b><small>{name(p.id)}{p.id === bank ? ' · bankéř' : ''}</small></span>)}
      <span className="game-score"><b>{view.hand}/{view.hands}</b><small>kolo</small></span>
    </>}
    controls={{
      title: view.phase === 'finished' ? 'Konec hry' : !idle ? 'Karty jsou v pohybu…' : canAct ? `Máš ${total}${bank === me ? ' · hraješ za banku' : ''}` : `${name(view.currentPlayerId)} ${view.currentPlayerId === bank ? 'hraje za banku' : 'je na tahu'}`,
      sub: myCards.length ? `Tvoje karty: ${total} ${total > 21 ? '(přes 21)' : ''} · eso 11, král 2, svršek a spodek 1` : 'Hraje se jen o body, bez sázek.',
      actions: legal.length ? <>
        <button className="btn btn-primary" onClick={() => act({ type: 'okoHit' })}>Ještě kartu</button>
        <button className="btn btn-secondary" onClick={() => act({ type: 'okoStand' })}>Stojím</button>
      </> : undefined,
    }}
    outcome={result ? { winnerIds: result.winnerIds,
      title: result.winnerIds.length > 1 ? `Dělíte se o výhru: ${result.winnerIds.map(name).join(' a ')}.` : result.winnerIds[0] === me ? 'Nejvíc bodů máš ty.' : `${name(result.winnerIds[0] ?? '')} má nejvíc bodů.`,
      note: view.players.map((p) => `${name(p.id)} ${plural(result.scores[p.id] ?? 0, 'bod', 'body', 'bodů')}`).join(' · ') } : null}
    finished={view.phase === 'finished'} idle={idle}>
    {view.deckCount > 0 && <div className="stock-pile" style={{ left: geo.deck.x, top: geo.deck.y, width: geo.deckW, height: geo.deckH }} aria-hidden><CardBack /></div>}
    {display.banner && <TableChip x={geo.discard.x} y={geo.discard.y} tone="accent">{display.banner}</TableChip>}
  </GameShell>;
}

/** Hands stay in draw order; the bank's cards wait in the console's play slot. */
function placeOko(d: OkoDisplay, geo: Geometry, me: string): PlacedCard[] {
  const out: PlacedCard[] = [];
  const mine = placeMyHand(geo, d.hands[me] ?? [], false, { hovered: null, selected: null, pendingKey: null, playable: new Set(), myTurn: false });
  for (const e of d.hands[me] ?? []) out.push({ entity: e, zone: 'mine', place: mine.get(e.key)! });
  for (const [id, hand] of Object.entries(d.hands)) {
    if (id === me) continue;
    const seat = geo.seats[id];
    const bank = d.view.bankId === id;
    const scale = bank ? geo.discardScale * .8 : geo.oppScale * 1.25;
    const cx = bank ? geo.discard.x : seat?.x ?? geo.w / 2, cy = bank ? geo.discard.y : seat?.y ?? 40;
    const step = geo.cardW * scale * .42;
    hand.forEach((e, i) => out.push({ entity: e, zone: 'opp', place: { x: cx + (i - (hand.length - 1) / 2) * step, y: cy, rotate: (i - (hand.length - 1) / 2) * 4, scale, faceUp: !!e.card, z: 150 + i } }));
  }
  d.outgoing.forEach((e, i) => out.push({ entity: e, zone: 'outgoing', place: { x: geo.deck.x, y: geo.deck.y, rotate: 0, scale: geo.deckScale, faceUp: false, z: 40 + i } }));
  return out;
}
