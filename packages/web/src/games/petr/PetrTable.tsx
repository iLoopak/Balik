import { useEffect, useState } from 'react';
import { petrLegalFromView, PETR_CARD_ID, type RoomView } from '@balik/shared';
import { cardsWord } from '../../lib/format';
import { sendAction } from '../../net/client';
import { useApp } from '../../net/store';
import { placeMyHand, placeOpponent, type Geometry, type HandUi, type PlacedCard } from '../../table/layout';
import { usePerfLite } from '../../table/usePerfLite';
import { GameShell, TableChip, useGameGeometry } from '../GameShell';
import { useGameDirector } from '../useGameDirector';
import { PETR_SCRIPT, type PetrDisplay } from './display';

/** A wide stage: the neighbour's cards fan out across it when it is my turn to draw. */
function petrGeometry(g: Geometry): Geometry {
  const deckX = g.compact ? g.cardW * .55 + 6 : g.cardW * .9 + 12;
  const left = deckX + g.deckW * .7, right = g.w - 10;
  return { ...g, deck: { x: deckX, y: g.discard.y }, discard: { x: (left + right) / 2, y: g.discard.y }, stage: { width: right - left, height: g.cardH * 1.25 } };
}

export function PetrTable({ room, reducedMotion }: { room: RoomView<'petr'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const { display, idle, environment } = useGameDirector(room, PETR_SCRIPT, reducedMotion || lite);
  useEffect(() => setBusy(!idle), [idle]);
  const me = room.you, view = display.view, truth = room.game!;
  const pending = useApp((s) => s.pending), status = useApp((s) => s.status);
  const [hovered, setHovered] = useState<string | null>(null);
  const { ref, geo } = useGameGeometry(view.players.map((p) => p.id), me, (display.hands[me] ?? []).length, petrGeometry);
  const canAct = idle && !pending && status === 'open' && truth.phase === 'playing' && truth.currentPlayerId === me;
  const legal = canAct ? petrLegalFromView(truth, me) : [];
  const name = (id: string) => id === me ? 'Ty' : room.players.find((p) => p.id === id)?.name ?? 'Hráč';
  const targetHand = display.hands[view.targetId] ?? [];
  const picking = view.phase === 'playing' && view.currentPlayerId === me;
  const activate = (key: string) => {
    const index = targetHand.findIndex((e) => e.key === key);
    if (canAct && index >= 0 && index < legal.length) sendAction({ type: 'petrDraw', index });
  };
  const placed = placePetr(display, geo, me, picking ? view.targetId : null, { hovered: null, selected: null, pendingKey: null, playable: new Set(), myTurn: false }, canAct ? hovered : null);
  const holdingPetr = (truth.myHand ?? []).some((c) => c.id === PETR_CARD_ID);
  const result = view.result;
  return <GameShell room={room} gameId="petr" tableRef={ref} geo={geo} placed={placed} stamp={display.stamp} lite={lite} reducedMotion={reducedMotion}
    fxFor={(p) => p.zone === 'opp' && picking && canAct && targetHand.some((e) => e.key === p.entity.key) ? { playable: true } : undefined}
    interactive={(p) => canAct && p.zone === 'opp' && targetHand.some((e) => e.key === p.entity.key)} hovered={hovered} onHover={setHovered} onActivate={activate}
    environment={environment} myTurn={canAct} activeId={view.phase === 'playing' ? view.currentPlayerId : null}
    seatInfo={(id) => { const p = view.players.find((x) => x.id === id); return { sub: p ? (p.out ? 'bez karet' : `${p.handCount} ${cardsWord(p.handCount)}`) : undefined, badge: p?.out ? 'venku' : id === view.targetId && view.currentPlayerId === me ? 'táhneš' : undefined, tone: p?.out ? 'good' : undefined }; }}
    controls={{
      title: view.phase === 'finished' ? 'Konec hry' : !idle ? 'Karty jsou v pohybu…' : canAct ? `Vytáhni kartu od hráče ${name(view.targetId)}` : `${name(view.currentPlayerId)} tahá od ${view.targetId === me ? 'tebe' : name(view.targetId)}`,
      sub: holdingPetr ? 'Černý Petr je u tebe. Snad si ho někdo vytáhne.' : 'Dvojice stejné hodnoty se odloží samy.',
    }}
    outcome={result ? { winnerIds: result.winnerIds,
      title: result.reason === 'forfeit' ? 'Kontumace po odchodu hráče.' : result.loserId === me ? 'Zůstal ti Černý Petr.' : `Černý Petr zůstal hráči ${name(result.loserId ?? '')}.`,
      note: result.finishOrder.length ? `Venku v pořadí: ${result.finishOrder.map(name).join(', ')}` : undefined } : null}
    finished={view.phase === 'finished'} idle={idle}>
    {display.pile.length > 0 && <TableChip x={geo.deck.x} y={geo.deck.y + geo.deckH * .7}><span className="type-machine">Dvojice</span> {display.pile.length / 2}</TableChip>}
  </GameShell>;
}

function placePetr(d: PetrDisplay, geo: Geometry, me: string, targetId: string | null, ui: HandUi, hovered: string | null): PlacedCard[] {
  const out: PlacedCard[] = [];
  const mine = placeMyHand(geo, d.hands[me] ?? [], false, ui);
  for (const e of d.hands[me] ?? []) out.push({ entity: e, zone: 'mine', place: mine.get(e.key)! });
  for (const [id, hand] of Object.entries(d.hands)) {
    if (id === me) continue;
    if (id === targetId) {
      // The neighbour's hand, spread face down across the stage so a card can be picked.
      const width = geo.stage?.width ?? geo.w * .7, n = hand.length, scale = geo.compact ? .7 : .78;
      const step = n > 1 ? Math.min(geo.cardW * scale * .78, (width - geo.cardW * scale) / (n - 1)) : 0;
      hand.forEach((e, i) => {
        const lifted = hovered === e.key;
        out.push({ entity: e, zone: 'opp', place: { x: geo.discard.x + (i - (n - 1) / 2) * step, y: geo.discard.y - (lifted ? geo.cardH * .12 : 0), rotate: (i - (n - 1) / 2) * 1.5, scale: lifted ? scale * 1.06 : scale, faceUp: false, z: 300 + i } });
      });
    } else hand.forEach((e, i) => out.push({ entity: e, zone: 'opp', place: placeOpponent(geo, id, hand.length, i) }));
  }
  d.pile.forEach((e, i) => out.push({ entity: e, zone: 'discard', place: { x: geo.deck.x + ((i * 7) % 11) - 5, y: geo.deck.y + ((i * 5) % 9) - 4, rotate: ((i * 37) % 30) - 15, scale: geo.deckScale * .9, faceUp: true, z: 60 + i } }));
  return out;
}
