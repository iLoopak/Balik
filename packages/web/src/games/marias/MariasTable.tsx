import { useEffect, useState } from 'react';
import { mariasDiscardOk, mariasLegalFromView, type MariasAction, type MariasContract, type RoomView } from '@balik/shared';
import { SuitIcon } from '../../cards/SuitIcon';
import { rankLabel, suitName } from '../../cards/skin';
import { brandAudio } from '../../brand/audio';
import { cardsWord, plural } from '../../lib/format';
import { sendAction } from '../../net/client';
import { showToast, useApp } from '../../net/store';
import { placeMyHand, placeOpponent, type Geometry, type HandUi, type PlacedCard } from '../../table/layout';
import { usePerfLite } from '../../table/usePerfLite';
import { GameShell, TableChip, useGameGeometry } from '../GameShell';
import { useGameDirector } from '../useGameDirector';
import { CONTRACT_NAME, MARIAS_SCRIPT, type MariasDisplay } from './display';

const CAN_HOVER = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function MariasTable({ room, reducedMotion }: { room: RoomView<'marias'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const { display, idle, environment } = useGameDirector(room, MARIAS_SCRIPT, reducedMotion || lite);
  useEffect(() => setBusy(!idle), [idle]);
  const me = room.you, view = display.view, truth = room.game!;
  const pending = useApp((s) => s.pending), status = useApp((s) => s.status);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const { ref, geo } = useGameGeometry(view.players.map((p) => p.id), me, (display.hands[me] ?? []).length);
  const myTurn = idle && !pending && status === 'open' && truth.phase !== 'finished' && truth.currentPlayerId === me;
  const legal = myTurn ? mariasLegalFromView(truth, me) : [];
  const playable = new Set(legal.flatMap((a) => 'cardId' in a ? [a.cardId] : []));
  const declaring = myTurn && truth.phase === 'declaring';
  const hand = truth.myHand ?? [];
  useEffect(() => { if (!myTurn) setSelected([]); }, [myTurn, truth.phase]);
  const name = (id: string) => id === me ? 'Ty' : room.players.find((p) => p.id === id)?.name ?? 'Hráč';
  const act = (action: MariasAction) => { if (sendAction(action)) setSelected([]); };
  const activate = (key: string) => {
    if (declaring) { setSelected((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s.slice(-1), key]); brandAudio.play('select'); return; }
    const action = legal.find((a) => 'cardId' in a && a.cardId === key);
    if (!action) return;
    if (!CAN_HOVER && truth.phase === 'playing' && selected[0] !== key) { setSelected([key]); brandAudio.play('select'); return; }
    act(action);
  };
  const declare = (contract: MariasContract) => {
    if (!mariasDiscardOk(hand, selected, contract)) return showToast(contract === 'hra' ? 'Do talonu dej 2 karty. Eso ani desítku ve Hře odhodit nesmíš.' : 'Do talonu dej právě 2 karty.');
    act({ type: 'mariasDeclare', discard: selected, contract });
  };
  const placed = placeMarias(display, geo, me, { hovered: myTurn ? hovered : null, selected: truth.phase === 'playing' ? selected[0] ?? null : null, pendingKey: null, playable: declaring ? new Set(hand.map((c) => c.id)) : playable, myTurn });
  const declarer = view.declarerId;
  const defenderPts = view.players.filter((p) => p.id !== declarer).reduce((n, p) => n + p.points, 0);
  const declarerPts = view.players.find((p) => p.id === declarer)?.points ?? 0;
  const result = view.result;
  const won = !!result?.winnerIds.includes(me);
  const phaseTitle = view.phase === 'finished' ? 'Konec hry' : !idle ? 'Karty jsou v pohybu…'
    : view.phase === 'choosingTrump' ? (myTurn ? 'Vyber trumf ze svých 7 karet' : `${name(declarer)} volí trumf`)
    : view.phase === 'declaring' ? (myTurn ? `Odhoď 2 karty (${selected.length}/2) a zvol hru` : `${name(declarer)} odhazuje do talonu`)
    : myTurn ? (view.trick.length ? 'Přiznej a přebij, když to jde' : 'Vynášíš') : `${name(view.currentPlayerId)} je na tahu`;
  return <GameShell room={room} gameId="marias" tableRef={ref} geo={geo} placed={placed} stamp={display.stamp} lite={lite} reducedMotion={reducedMotion}
    fxFor={(p) => p.zone === 'mine' ? { playable: myTurn && (declaring || playable.has(p.entity.key)), dimmed: myTurn && !declaring && !playable.has(p.entity.key), selected: selected.includes(p.entity.key) } : undefined}
    interactive={(p) => p.zone === 'mine' && myTurn} hovered={hovered} onHover={setHovered} onActivate={activate}
    environment={environment} suit={view.contract === 'hra' ? view.trump : null} myTurn={myTurn} activeId={view.phase !== 'finished' ? view.currentPlayerId : null}
    seatInfo={(id) => { const p = view.players.find((x) => x.id === id); return { sub: p ? `${p.handCount} ${cardsWord(p.handCount)} · ${plural(p.tricks, 'štych', 'štychy', 'štychů')}` : undefined, badge: id === declarer ? 'volič' : 'obrana' }; }}
    top={<>
      <span className={`game-score${declarer === me ? ' is-current' : ''}`}><b>{view.contract === 'hra' || !view.contract ? declarerPts : view.players.find((p) => p.id === declarer)?.tricks ?? 0}</b><small>Volič · {name(declarer)}</small></span>
      <span className="game-score"><b>{view.contract ? CONTRACT_NAME[view.contract] : '—'}</b><small>{view.trump && view.contract !== 'betl' && view.contract !== 'durch' ? `trumf ${suitName(view.trump).toLowerCase()}` : view.contract ? 'bez trumfů' : 'volba'}</small></span>
      <span className={`game-score${declarer !== me ? ' is-current' : ''}`}><b>{view.contract === 'hra' || !view.contract ? defenderPts : view.players.filter((p) => p.id !== declarer).reduce((n, p) => n + p.tricks, 0)}</b><small>Obrana</small></span>
    </>}
    controls={{
      title: phaseTitle,
      sub: view.phase === 'declaring' && myTurn ? 'Ve Hře nesmíš odhodit eso ani desítku. Betl: neber nic. Durch: ber vše.' : view.contract === 'hra' ? 'Eso a desítka 10, poslední štych 10, hlášky 20/40' : view.contract ? CONTRACT_NAME[view.contract] : 'Volený mariáš',
      actions: declaring ? <>
        {(['hra', 'betl', 'durch'] as const).map((c) => <button key={c} className={`btn ${c === 'hra' ? 'btn-primary' : 'btn-secondary'}`} disabled={selected.length !== 2} onClick={() => declare(c)}>{CONTRACT_NAME[c]}</button>)}
      </> : view.phase === 'playing' && selected[0] && playable.has(selected[0]) ? <button className="btn btn-primary" onClick={() => act({ type: 'mariasPlay', cardId: selected[0]! })}>Zahrát</button> : undefined,
    }}
    outcome={result ? { winnerIds: result.winnerIds,
      title: result.reason === 'forfeit' ? 'Kontumace po odchodu hráče.' : won ? (result.declarerId === me ? `${CONTRACT_NAME[result.contract]} vyšla.` : 'Obrana vyhrála.') : result.declarerId === me ? `${CONTRACT_NAME[result.contract]} nevyšla.` : `${name(result.declarerId)} vyhrává.`,
      note: result.contract === 'hra' ? `Volič ${result.declarerPoints} : obrana ${result.defenderPoints} bodů${view.talon?.length ? ` · talon: ${view.talon.map((c) => `${rankLabel(c.rank)} ${suitName(c.suit).toLowerCase()}`).join(', ')}` : ''}` : result.contract === 'betl' ? 'Betl: volič nesměl vzít žádný štych.' : 'Durch: volič musel vzít všechny štychy.' } : null}
    finished={view.phase === 'finished'} idle={idle}>
    {view.trumpCard && <TableChip x={geo.deck.x} y={geo.deck.y - geo.deckH * .7} tone={display.banner ? 'accent' : undefined}>
      <SuitIcon suit={view.trumpCard.suit} style={{ color: 'var(--accent-text)' }} /> {display.banner ?? (view.contract && view.contract !== 'hra' ? `${CONTRACT_NAME[view.contract]} · bez trumfů` : `Trumf · ${rankLabel(view.trumpCard.rank)} ${suitName(view.trumpCard.suit).toLowerCase()}`)}
    </TableChip>}
  </GameShell>;
}

function placeMarias(d: MariasDisplay, geo: Geometry, me: string, ui: HandUi): PlacedCard[] {
  const out: PlacedCard[] = [];
  const mine = placeMyHand(geo, d.hands[me] ?? [], false, ui);
  for (const e of d.hands[me] ?? []) out.push({ entity: e, zone: 'mine', place: mine.get(e.key)! });
  for (const [id, hand] of Object.entries(d.hands)) if (id !== me) hand.forEach((e, i) => out.push({ entity: e, zone: 'opp', place: placeOpponent(geo, id, hand.length, i) }));
  d.talon.forEach((e, i) => out.push({ entity: e, zone: 'discard', place: { x: geo.deck.x + i * 4, y: geo.deck.y + i * 3, rotate: -6 + i * 10, scale: geo.deckScale, faceUp: false, z: 50 + i } }));
  // Each trick card sits on the side of the player who played it.
  d.trick.forEach((p, i) => {
    const seat = geo.seats[p.playerId];
    const dx = p.playerId === me ? 0 : seat && seat.x < geo.w / 2 ? -1 : 1;
    out.push({ entity: p.entity, zone: 'discard', place: { x: geo.discard.x - geo.cardW * .4 + dx * geo.cardW * .42, y: geo.discard.y + (p.playerId === me ? geo.cardH * .12 : -geo.cardH * .08), rotate: dx * 8, scale: geo.discardScale * .92, faceUp: true, z: 300 + i } });
  });
  const target = d.captureTo === me ? { x: geo.w / 2, y: geo.h + geo.cardH } : geo.seats[d.captureTo ?? ''] ?? { x: geo.w / 2, y: -geo.cardH };
  d.outgoing.forEach((e, i) => out.push({ entity: e, zone: 'outgoing', place: { x: target.x, y: target.y, rotate: i * 4, scale: .4, faceUp: false, z: 450 + i } }));
  return out;
}
