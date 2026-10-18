import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sedmaLegalFromView, type RoomView } from '@balik/shared';
import { CardBack } from '../cards/Card';
import { BrandResults } from '../brand/BrandResults';
import { EmoteBubble, ResultReactions, useEmotes } from '../brand/Emotes';
import { brandAudio } from '../brand/audio';
import { Avatar, AvatarTurnLabel } from '../avatars/Avatar';
import { avatarTurn } from '../avatars/status';
import { useElementSize } from '../lib/useElementSize';
import { useApp } from '../net/store';
import { eveningAction, leaveRoom, rematch, returnToLobby, sendAction } from '../net/client';
import { CardLayer } from '../table/CardLayer';
import { computeGeometry, type Geometry } from '../table/layout';
import { GameTableTheme } from '../table/GameTableTheme';
import { usePerfLite } from '../table/usePerfLite';
import { placeSedma } from './layout';
import { useSedmaDirector } from './useSedmaDirector';
import '../table/table.css';
import './sedma.css';

const TIPS = [
  ['Barva nehraje roli.', 'Hraješ jakoukoli kartu z ruky. Štych drží poslední sedma nebo karta hodnoty první karty.'],
  ['Štych může pokračovat.', 'Vycházející po oběhu buď ukončí štych, nebo přiloží sedmu či původní hodnotu. Vítěz potom dobírá první.'],
  ['Hledej body.', 'Esa a desítky mají po 10 bodech. Ve čtyřech tvoří tým protější sedadla. Bonus posledního štychu vidíš nahoře.'],
] as const;
export function SedmaTable({ room, reducedMotion }: { room: RoomView<'sedma'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const quiet = reducedMotion || lite;
  const { display, idle, environment } = useSedmaDirector(room, quiet);
  useEffect(() => setBusy(!idle), [idle]);
  const view = display.view;
  const [ref, size] = useElementSize<HTMLDivElement>();
  const me = room.you;
  const pending = useApp((s) => s.pending);
  const status = useApp((s) => s.status);
  const emotes = useEmotes(room.code);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tip, setTip] = useState<number | null>(() => {
    try { return localStorage.getItem('balik.sedma.intro') ? null : 0; } catch { return 0; }
  });
  const geo: Geometry = useMemo(() => {
    const result = computeGeometry(size.width || 360, size.height || 560, view.players.map((p) => p.id), me, (display.hands[me] ?? []).length);
    return { ...result, discard: { x: result.w / 2, y: result.discard.y }, deck: { x: 28, y: result.controlY - 30 }, deckScale: .35, deckW: result.cardW * .35, deckH: result.cardH * .35 };
  }, [size.width, size.height, view.players, display.hands, me]);
  const truth = room.game!;
  const canAct = idle && !pending && status === 'open' && truth.phase === 'playing' && truth.currentPlayerId === me;
  const moves = canAct ? sedmaLegalFromView(truth, me) : [];
  const playable = new Set(moves.flatMap((a) => a.type === 'play' ? [a.cardId] : []));
  const canCollect = moves.some((a) => a.type === 'collect');
  const placed = placeSedma(display, geo, me, { hovered, selected, pendingKey: null, playable, myTurn: canAct });
  const teamOf = (id: string) => view.players.find((p) => p.id === id)?.team ?? 0;
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Odpojený hráč';
  const myTeam = teamOf(me);
  useEffect(() => { if (!canAct) setSelected(null); }, [canAct]);
  const play = (id: string) => { if (playable.has(id) && sendAction({ type: 'play', cardId: id })) setSelected(null); };
  const start = view.players.findIndex((p) => p.id === (display.trick[0]?.playerId ?? view.leaderId));
  const order = [...view.players.slice(start), ...view.players.slice(0, start)];
  const closeTip = () => { setTip(null); try { localStorage.setItem('balik.sedma.intro', '1'); } catch { /* no storage */ } };

  return <section className="sedma-shell" aria-label="Sedma">
    <div className="sedma-scores" aria-label="Týmové body">
      {([0, 1] as const).map((team) => <div key={team} className={`sedma-score sedma-team-${team}`}><span>Tým {team + 1}{team === myTeam ? ' · tvůj' : ''}</span><strong>{view.scores[team]}</strong><small>{view.players.filter((p) => p.team === team).map((p) => name(p.id)).join(' + ')}</small></div>)}
      <span className="sedma-total">{view.drawCount} v balíčku<br />Poslední +{view.lastTrickBonus}</span>
    </div>
    <div className="table sedma-table" ref={ref} data-game="sedma" data-idle={idle} data-quiet={quiet}>
      <GameTableTheme game="sedma" you={me} drawCount={view.drawCount} pulses={environment} geo={geo} suit={display.trick.at(-1)?.entity.card?.suit ?? null} reduced={quiet} lite={lite} myTurn={status === 'open' && view.phase === 'playing' && view.currentPlayerId === me} />
      <div className="sedma-stock" aria-label={`Dobírací balíček: ${view.drawCount} karet`} style={{ left: geo.deck.x, top: geo.deck.y, width: geo.cardW * .35, height: geo.cardH * .35 }}><CardBack /><span>{view.drawCount}</span></div>
      {view.players.filter((p) => p.id !== me).map((p) => {
        const seat = geo.seats[p.id]!;
        const isCurrent = view.phase === 'playing' && view.currentPlayerId === p.id;
        const message = emotes.find((m) => m.playerId === p.id);
        return <div key={p.id} className={`sedma-seat sedma-team-${p.team}${isCurrent ? ' is-current' : ''}`} style={{ left: seat.x, top: seat.y + geo.cardH * geo.oppScale * .56 + 8 }}>
          <Avatar player={room.players.find(r => r.id === p.id) ?? { id: p.id, name: name(p.id) }} size={32} turn={avatarTurn(room, p.id, status === 'open')} reduced={quiet} />
          <span><b>{name(p.id)}</b><AvatarTurnLabel turn={avatarTurn(room, p.id, status === 'open')} /><small>Tým {p.team + 1} · {(display.hands[p.id] ?? []).length} karty{room.players.find((r) => r.id === p.id)?.connected ? '' : ' · odpojeno'}</small></span>
          {message && <EmoteBubble message={message} author={name(p.id)} />}
        </div>;
      })}
      <div className="sedma-trick-order" aria-label="Pořadí ve štychu" style={{ top: geo.discard.y + geo.cardH * .56 }}>
        {order.map((p, i) => <span key={p.id} className={`sedma-team-${p.team}`}><b>{i + 1}.</b> {p.id === me ? 'Ty' : name(p.id)}</span>)}
      </div>
      <CardLayer game="sedma" placed={placed} geo={geo} stamp={display.stamp} speed={quiet ? .15 : 1} reduced={quiet}
        fxFor={(p) => ({ playable: p.zone === 'mine' && playable.has(p.entity.card?.id ?? ''), selected: selected === p.entity.key,
          dimmed: p.zone === 'mine' && canAct && !playable.has(p.entity.card?.id ?? ''), current: p.zone === 'discard' && (p.entity.card?.rank === 'A' || p.entity.card?.rank === '10') })}
        hoverKey={hovered} interactive={(p) => canAct && p.zone === 'mine' && playable.has(p.entity.card?.id ?? '')}
        onHover={(key) => { setHovered(key); }} onActivate={(key) => {
          const card = (display.hands[me] ?? []).find((e) => e.key === key)?.card;
          if (!card) return;
          if (selected === key || matchMedia('(hover: hover) and (pointer: fine)').matches) play(card.id);
          else { setSelected(key); brandAudio.play('select'); }
        }} />
      <AnimatePresence>{display.resolution && <motion.div key={`${room.round}:${display.resolution.winnerId}:${view.lastTrick?.cards.length ?? display.trick.length}`} className="sedma-resolution" role="status"
        initial={quiet ? false : { opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ top: geo.discard.y - geo.cardH * .65 }}>
        {name(display.resolution.winnerId)} bere štych · +{display.resolution.points}
      </motion.div>}</AnimatePresence>
      <div className={`sedma-controls sedma-team-${myTeam}`} style={{ top: geo.controlY }}>
        <Avatar player={room.players.find(p => p.id === me) ?? { id: me, name: name(me) }} size={30} turn={avatarTurn(room, me, status === 'open')} reduced={quiet} />
        <span className="sedma-turn" role="status">{view.phase === 'finished' ? 'Konec partie' : !idle ? 'Karty jsou v pohybu…' : canAct ? truth.deciding ? 'Ukončit, nebo pokračovat?' : 'Jsi na tahu' : `${name(view.currentPlayerId)} je na tahu`}<small>Tým {myTeam + 1} · {truth.deciding ? 'Pokračování: sedma nebo původní hodnota' : 'Hraješ jakoukoli kartu'}</small></span>
        {canCollect && <button className="btn btn-primary" onClick={() => sendAction({ type: 'collect' })}>Ukončit štych</button>}
        {selected && <button className="btn btn-primary" onClick={() => { const card = (display.hands[me] ?? []).find((e) => e.key === selected)?.card; if (card) play(card.id); }}>Zahrát</button>}
        <button className="sedma-help" aria-label="Pravidla Sedmy" onClick={() => setTip(0)}>?</button>
        {emotes.filter((m) => m.playerId === me).map((m) => <EmoteBubble key={m.id} message={m} author={name(me)} mine />)}
      </div>
      {tip !== null && view.phase !== 'finished' && <aside className="sedma-tip" aria-label="Rychlé vysvětlení Sedmy"><strong>{tip + 1}/3 · {TIPS[tip]![0]}</strong><p>{TIPS[tip]![1]}</p><div><button className="btn btn-secondary" onClick={() => tip < 2 ? setTip(tip + 1) : closeTip()}>{tip < 2 ? 'Dál' : 'Jdeme hrát'}</button><button className="btn btn-ghost" onClick={closeTip}>Zavřít</button></div></aside>}
      {view.phase === 'finished' && idle && <div className="sedma-results-wrap"><div className="win-panel"><BrandResults onChangeGame={()=>eveningAction('openVote')} onCloseEvening={()=>eveningAction('close')} reactions={<ResultReactions room={room} messages={emotes}/>} room={room} winnerId={view.winnerId} pending={pending} reduced={quiet} onRematch={rematch} onLobby={returnToLobby} onLeave={leaveRoom} /></div></div>}
    </div>
  </section>;
}
