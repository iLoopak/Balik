import { useEffect, useState } from 'react';
import { snapsLegalFromView, type RoomView, type SnapsAction } from '@balik/shared';
import { CardBack } from '../../cards/Card';
import { SuitIcon } from '../../cards/SuitIcon';
import { suitName } from '../../cards/skin';
import { brandAudio } from '../../brand/audio';
import { sendAction } from '../../net/client';
import { cardsWord, plural } from '../../lib/format';
import { useApp } from '../../net/store';
import { placeMyHand, placeOpponent, type PlacedCard } from '../../table/layout';
import { usePerfLite } from '../../table/usePerfLite';
import { GameShell, TableChip, useGameGeometry } from '../GameShell';
import { useGameDirector } from '../useGameDirector';
import { SNAPS_SCRIPT, type SnapsDisplay } from './display';

const CAN_HOVER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const REASON: Record<string, string> = { reached66: 'dosažením 66', closedFailed: 'protože zavírající nedosáhl 66', lastTrick: 'posledním štychem', forfeit: 'kontumačně' };

export function SnapsTable({ room, reducedMotion }: { room: RoomView<'snaps'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const { display, idle, environment } = useGameDirector(room, SNAPS_SCRIPT, reducedMotion || lite);
  useEffect(() => setBusy(!idle), [idle]);
  const me = room.you, view = display.view, truth = room.game!;
  const pending = useApp((s) => s.pending), status = useApp((s) => s.status);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { ref, geo } = useGameGeometry(view.players.map((p) => p.id), me, (display.hands[me] ?? []).length);
  const canAct = idle && !pending && status === 'open' && truth.phase === 'playing' && truth.currentPlayerId === me;
  const legal = canAct ? snapsLegalFromView(truth, me) : [];
  const plays = new Map(legal.flatMap((a) => a.type === 'snapsPlay' ? [[a.cardId, a] as const] : []));
  useEffect(() => { if (!canAct) setSelected(null); }, [canAct]);
  const name = (id: string) => id === me ? 'Ty' : room.players.find((p) => p.id === id)?.name ?? 'Soupeř';
  const act = (action: SnapsAction) => { if (sendAction(action)) setSelected(null); };
  const activate = (key: string) => {
    const action = plays.get(key);
    if (!action) return;
    if (!CAN_HOVER && selected !== key) { setSelected(key); brandAudio.play('select'); return; }
    act(action);
  };
  const placed = placeSnaps(display, geo, me, { hovered: canAct ? hovered : null, selected, pendingKey: null, playable: new Set(plays.keys()), myTurn: canAct });
  const leading = canAct && !truth.trick.length;
  const opp = view.players.find((p) => p.id !== me);
  const mine = view.players.find((p) => p.id === me);
  const result = view.result;
  const won = !!result?.winnerIds.includes(me);
  return <GameShell room={room} gameId="snaps" tableRef={ref} geo={geo} placed={placed} stamp={display.stamp} lite={lite} reducedMotion={reducedMotion}
    fxFor={(p) => p.zone === 'mine' ? { playable: canAct && plays.has(p.entity.key), dimmed: canAct && !plays.has(p.entity.key), selected: selected === p.entity.key } : undefined}
    interactive={(p) => p.zone === 'mine' && canAct} hovered={hovered} onHover={setHovered} onActivate={activate}
    environment={environment} drawCount={view.talonCount} suit={view.trump} myTurn={canAct} activeId={view.phase === 'playing' ? view.currentPlayerId : null}
    seatInfo={(id) => { const p = view.players.find((x) => x.id === id); return { sub: p ? `${p.handCount} ${cardsWord(p.handCount)} · ${plural(p.tricks, 'štych', 'štychy', 'štychů')}` : undefined, badge: p ? `${p.points} b.` : undefined }; }}
    top={<>
      <span className={`game-score${view.currentPlayerId === me ? ' is-current' : ''}`}><b>{mine?.points ?? 0}{mine?.pending ? ` +${mine.pending}` : ''}</b><small>Ty · {plural(mine?.tricks ?? 0, 'štych', 'štychy', 'štychů')}</small></span>
      <span className="game-score"><b>66</b><small>cíl</small></span>
      <span className={`game-score${view.currentPlayerId === opp?.id ? ' is-current' : ''}`}><b>{opp?.points ?? 0}{opp?.pending ? ` +${opp.pending}` : ''}</b><small>{name(opp?.id ?? '')}</small></span>
    </>}
    controls={{
      title: view.phase === 'finished' ? 'Konec hry' : !idle ? 'Karty jsou v pohybu…' : canAct ? (leading ? 'Vynášíš' : 'Odpovídáš') : `${name(view.currentPlayerId)} je na tahu`,
      sub: `Trumf ${suitName(view.trump).toLowerCase()} · ${view.strict ? 'přiznat, přebít, trumfovat' : 'talon otevřený, hraj cokoli'}${leading ? ' · hláška se ohlásí sama' : ''}`,
      actions: <>
        {legal.some((a) => a.type === 'snapsExchange') && <button className="btn btn-secondary" onClick={() => act({ type: 'snapsExchange' })}>Vyměnit devítku</button>}
        {legal.some((a) => a.type === 'snapsClose') && <button className="btn btn-secondary" onClick={() => act({ type: 'snapsClose' })}>Zavřít talon</button>}
        {selected && plays.get(selected) && <button className="btn btn-primary" onClick={() => act(plays.get(selected)!)}>Zahrát</button>}
      </>,
    }}
    outcome={result ? { winnerIds: result.winnerIds, title: result.reason === 'forfeit' && !result.winnerIds.length ? 'Partie končí bez vítěze.' : won ? `Vyhráváš ${plural(result.gamePoints, 'bod', 'body', 'bodů')}.` : `${name(result.winnerIds[0] ?? '')} bere ${plural(result.gamePoints, 'bod', 'body', 'bodů')}.`,
      note: `Šnaps ${REASON[result.reason]} · ${Object.entries(result.points).map(([id, pts]) => `${name(id)} ${pts}`).join(' : ')}` } : null}
    finished={view.phase === 'finished'} idle={idle}>
    {view.talonCount > 0 && <div className={`snaps-talon${view.closedBy ? ' is-closed' : ''}`} style={{ left: geo.deck.x, top: geo.deck.y, width: geo.deckW, height: geo.deckH }} aria-label={`Talon: ${view.talonCount} karet${view.closedBy ? ', zavřený' : ''}`}>
      <CardBack />{view.closedBy && <span className="type-machine">Zavřeno</span>}
    </div>}
    <TableChip x={geo.discard.x} y={geo.discard.y + geo.pileH * .62} tone={display.banner ? 'accent' : undefined}>
      <SuitIcon suit={view.trump} style={{ color: 'var(--accent-text)' }} /> {display.banner ?? `Trumf · ${suitName(view.trump)}`}
    </TableChip>
  </GameShell>;
}

function placeSnaps(d: SnapsDisplay, geo: ReturnType<typeof useGameGeometry>['geo'], me: string, ui: Parameters<typeof placeMyHand>[3]): PlacedCard[] {
  const out: PlacedCard[] = [];
  const mine = placeMyHand(geo, d.hands[me] ?? [], false, ui);
  for (const e of d.hands[me] ?? []) out.push({ entity: e, zone: 'mine', place: mine.get(e.key)! });
  for (const [id, hand] of Object.entries(d.hands)) if (id !== me) hand.forEach((e, i) => out.push({ entity: e, zone: 'opp', place: placeOpponent(geo, id, hand.length, i) }));
  if (d.trump) out.push({ entity: d.trump, zone: 'discard', place: { x: geo.deck.x + geo.deckW * .45, y: geo.deck.y, rotate: 90, scale: geo.deckScale * .92, faceUp: true, z: 40 } });
  d.trick.forEach((p, i) => out.push({ entity: p.entity, zone: 'discard', place: { x: geo.discard.x + (i ? 1 : -1) * geo.cardW * .3, y: geo.discard.y + (i ? 4 : -4), rotate: i ? 7 : -5, scale: geo.discardScale, faceUp: true, z: 300 + i } }));
  const target = d.captureTo === me ? { x: geo.w / 2, y: geo.h + geo.cardH } : geo.seats[d.captureTo ?? ''] ?? { x: geo.w / 2, y: -geo.cardH };
  d.outgoing.forEach((e, i) => out.push({ entity: e, zone: 'outgoing', place: { x: target.x, y: target.y, rotate: i * 4, scale: .4, faceUp: false, z: 450 + i } }));
  return out;
}
