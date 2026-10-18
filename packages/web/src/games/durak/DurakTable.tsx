import { useEffect, useState } from 'react';
import { durakLegalFromView, type DurakAction, type RoomView } from '@balik/shared';
import { CardBack } from '../../cards/Card';
import { SuitIcon } from '../../cards/SuitIcon';
import { suitName } from '../../cards/skin';
import { brandAudio } from '../../brand/audio';
import { cardsWord } from '../../lib/format';
import { sendAction } from '../../net/client';
import { useApp } from '../../net/store';
import { placeMyHand, placeOpponent, type Geometry, type HandUi, type PlacedCard } from '../../table/layout';
import { usePerfLite } from '../../table/usePerfLite';
import { GameShell, TableChip, useGameGeometry } from '../GameShell';
import { useGameDirector } from '../useGameDirector';
import { DURAK_SCRIPT, type DurakDisplay } from './display';

const CAN_HOVER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Talon on the left, a wide strip for up to six attack/defence pairs. */
function durakGeometry(g: Geometry): Geometry {
  const deckX = g.compact ? g.cardW * .62 + 6 : g.cardW * .95 + 12;
  const left = deckX + g.deckW * .85, right = g.w - 10, width = right - left;
  const rows = width < g.cardW * 5.6 ? 2 : 1;
  const scale = rows === 2 ? .72 : g.compact ? .86 : .92;
  return { ...g, deck: { x: deckX, y: g.discard.y }, discard: { x: (left + right) / 2, y: g.discard.y }, stage: { width, height: g.cardH * scale * (rows === 2 ? 2.35 : 1.4) } };
}

export function DurakTable({ room, reducedMotion }: { room: RoomView<'durak'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const { display, idle, environment } = useGameDirector(room, DURAK_SCRIPT, reducedMotion || lite);
  useEffect(() => setBusy(!idle), [idle]);
  const me = room.you, view = display.view, truth = room.game!;
  const pending = useApp((s) => s.pending), status = useApp((s) => s.status);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { ref, geo } = useGameGeometry(view.players.map((p) => p.id), me, (display.hands[me] ?? []).length, durakGeometry);
  const canAct = idle && !pending && status === 'open' && truth.phase === 'playing' && truth.currentPlayerId === me;
  const legal = canAct ? durakLegalFromView(truth, me) : [];
  const plays = new Map(legal.flatMap((a) => 'cardId' in a ? [[a.cardId, a] as const] : []));
  useEffect(() => { if (!canAct) setSelected(null); }, [canAct]);
  const name = (id: string) => id === me ? 'Ty' : room.players.find((p) => p.id === id)?.name ?? 'Hráč';
  const act = (action: DurakAction) => { if (sendAction(action)) setSelected(null); };
  const activate = (key: string) => {
    const action = plays.get(key);
    if (!action) return;
    if (!CAN_HOVER && selected !== key) { setSelected(key); brandAudio.play('select'); return; }
    act(action);
  };
  const placed = placeDurak(display, geo, me, { hovered: canAct ? hovered : null, selected, pendingKey: null, playable: new Set(plays.keys()), myTurn: canAct });
  const defending = canAct && truth.role === 'defend';
  const result = view.result;
  const roleOf = (id: string) => view.players.find((p) => p.id === id)?.out ? 'venku' : id === view.defenderId ? 'brání' : id === view.attackerId ? 'útočí' : undefined;
  const title = view.phase === 'finished' ? 'Konec hry' : !idle ? 'Karty jsou v pohybu…'
    : canAct ? (defending ? 'Braň se, nebo ber' : view.table.length ? 'Přihoď, nebo nech být' : 'Útočíš')
    : `${name(view.currentPlayerId)} ${view.role === 'defend' ? 'se brání' : 'útočí'}`;
  return <GameShell room={room} gameId="durak" tableRef={ref} geo={geo} placed={placed} stamp={display.stamp} lite={lite} reducedMotion={reducedMotion}
    fxFor={(p) => p.zone === 'mine' ? { playable: canAct && plays.has(p.entity.key), dimmed: canAct && !plays.has(p.entity.key), selected: selected === p.entity.key } : undefined}
    interactive={(p) => p.zone === 'mine' && canAct} hovered={hovered} onHover={setHovered} onActivate={activate}
    environment={environment} drawCount={view.talonCount} suit={view.trump} myTurn={canAct} activeId={view.phase === 'playing' ? view.currentPlayerId : null}
    seatInfo={(id) => { const p = view.players.find((x) => x.id === id); return { sub: p ? (p.out ? 'bez karet' : `${p.handCount} ${cardsWord(p.handCount)}`) : undefined, badge: roleOf(id), tone: p?.out ? 'good' : undefined }; }}
    controls={{
      title, sub: `Trumf ${suitName(view.trump).toLowerCase()} · útoky ${view.table.length}/${view.limit}${me === view.defenderId ? ' · bráníš' : me === view.attackerId ? ' · útočíš' : ''}`,
      actions: <>
        {legal.some((a) => a.type === 'durakTake') && <button className="btn btn-danger" onClick={() => act({ type: 'durakTake' })}>Beru</button>}
        {legal.some((a) => a.type === 'durakPass') && <button className="btn btn-secondary" onClick={() => act({ type: 'durakPass' })}>Stačí</button>}
        {selected && plays.get(selected) && <button className="btn btn-primary" onClick={() => act(plays.get(selected)!)}>{defending ? 'Přebít' : 'Zahrát'}</button>}
      </>,
    }}
    outcome={result ? { winnerIds: result.winnerIds,
      title: !result.loserId ? 'Nikdo nezůstal durakem.' : result.loserId === me ? 'Zůstal ti durak.' : `${name(result.loserId)} zůstává durakem.`,
      note: result.reason === 'forfeit' ? 'Kontumace po odchodu hráče.' : view.finishOrder.length ? `Pořadí: ${view.finishOrder.map(name).join(', ')}` : undefined } : null}
    finished={view.phase === 'finished'} idle={idle}>
    {view.talonCount > 0 && <div className="stock-pile" style={{ left: geo.deck.x, top: geo.deck.y, width: geo.deckW, height: geo.deckH }} aria-label={`Talon: ${view.talonCount} ${cardsWord(view.talonCount)}`}><CardBack /></div>}
    <TableChip x={geo.deck.x} y={geo.deck.y + geo.deckH * .64}><SuitIcon suit={view.trump} style={{ color: 'var(--accent-text)' }} /> {suitName(view.trump)}</TableChip>
    {view.discardCount > 0 && <TableChip x={geo.w - 48} y={geo.discard.y - geo.cardH * .8}><span className="type-machine">Odhoz</span> {view.discardCount}</TableChip>}
  </GameShell>;
}

function placeDurak(d: DurakDisplay, geo: Geometry, me: string, ui: HandUi): PlacedCard[] {
  const out: PlacedCard[] = [];
  const mine = placeMyHand(geo, d.hands[me] ?? [], false, ui);
  for (const e of d.hands[me] ?? []) out.push({ entity: e, zone: 'mine', place: mine.get(e.key)! });
  for (const [id, hand] of Object.entries(d.hands)) if (id !== me) hand.forEach((e, i) => out.push({ entity: e, zone: 'opp', place: placeOpponent(geo, id, hand.length, i) }));
  if (d.trump) out.push({ entity: d.trump, zone: 'discard', place: { x: geo.deck.x + geo.deckW * .42, y: geo.deck.y, rotate: 90, scale: geo.deckScale * .9, faceUp: true, z: 40 } });
  const width = geo.stage?.width ?? geo.cardW * 6;
  const rows = width < geo.cardW * 5.6 ? 2 : 1, cols = rows === 2 ? 3 : 6;
  const scale = rows === 2 ? .72 : geo.compact ? .86 : .92;
  const pairW = Math.min(geo.cardW * scale * 1.3, width / cols);
  d.table.forEach((p, i) => {
    const row = Math.floor(i / cols), col = i % cols;
    const inRow = Math.min(cols, d.table.length - row * cols);
    const x = geo.discard.x + (col - (inRow - 1) / 2) * pairW;
    const y = geo.discard.y + (rows === 2 ? (row - .5) * geo.cardH * scale * 1.12 : 0);
    out.push({ entity: p.attack, zone: 'discard', place: { x: x - geo.cardW * scale * .1, y: y - geo.cardH * scale * .07, rotate: -4, scale, faceUp: true, z: 300 + i * 2 } });
    if (p.defense) out.push({ entity: p.defense, zone: 'discard', place: { x: x + geo.cardW * scale * .16, y: y + geo.cardH * scale * .14, rotate: 9, scale, faceUp: true, z: 301 + i * 2 } });
  });
  d.outgoing.forEach((e, i) => out.push({ entity: e, zone: 'outgoing', place: { x: geo.w + geo.cardW, y: geo.discard.y, rotate: 20 + i * 3, scale: .6, faceUp: false, z: 450 + i } }));
  return out;
}
