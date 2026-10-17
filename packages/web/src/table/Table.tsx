import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { legalMovesFromView, type RoomView, type Suit } from '@balik/shared';
import type { CardFx } from '../cards/Card';
import { CardBack } from '../cards/Card';
import { SuitIcon } from '../cards/SuitIcon';
import { SUIT_TONE } from '../cards/skin';
import { leaveRoom, rematch, sendAction } from '../net/client';
import { showToast, useApp } from '../net/store';
import { avatarColor, cardsWord } from '../lib/format';
import { useElementSize } from '../lib/useElementSize';
import { CardLayer } from './CardLayer';
import type { Display, FxItem } from './display';
import { ActionLabel, Impact, LockIcon, suitName } from './Effects';
import { EffectOrchestrator } from '../effects/EffectOrchestrator';
import type { EffectInstance } from '../effects/effectEvents';
import { MOTION_PRIMITIVES, primitiveTransition } from '../effects/effectPresets';
import { computeGeometry, placeAll, type Geometry, type HandUi, type PlacedCard } from './layout';
import { SuitPicker } from './SuitPicker';
import { useDirector } from './useDirector';
import { usePerfLite } from './usePerfLite';
import './table.css';

const CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function Table({ room, reducedMotion }: { room: RoomView; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false);
  const lite = usePerfLite(busy);
  const { display, fx, idle, speed, target } = useDirector(room, { reducedMotion, lite });
  useEffect(() => setBusy(!idle), [idle]);

  const pending = useApp((s) => s.pending);
  const status = useApp((s) => s.status);
  const me = room.you;
  const names = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const nameOf = useCallback((id: string) => names.get(id)?.name ?? 'Hráč', [names]);

  const [tableRef, size] = useElementSize<HTMLDivElement>();
  const myHand = display.hands[me] ?? [];
  const geo = useMemo(
    () => computeGeometry(size.width || 360, size.height || 640, display.order, me, myHand.length),
    [size.width, size.height, display.order, me, myHand.length],
  );

  // ---- interaction -------------------------------------------------------
  const myTurnShown = display.phase === 'playing' && display.currentPlayerId === me;
  const truth = target.game;
  const canAct = idle && !pending && status === 'open' && myTurnShown && truth?.phase === 'playing' && truth.currentPlayerId === me;
  const legal = useMemo(() => (canAct && truth ? legalMovesFromView(truth, me) : null), [canAct, truth, me]);
  const playable = useMemo(() => new Set(legal?.playable ?? []), [legal]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) setPendingKey(null);
  }, [pending]);
  useEffect(() => {
    if (!canAct) {
      setSelected(null);
      setPicking(null);
    }
  }, [canAct]);

  const play = useCallback(
    (key: string, chosenSuit?: Suit) => {
      if (sendAction({ type: 'play', cardId: key, chosenSuit })) {
        setPendingKey(key);
        setSelected(null);
        setHovered(null);
      }
    },
    [],
  );

  const activate = useCallback(
    (key: string) => {
      if (!canAct) {
        if (display.phase === 'playing' && !myTurnShown) showToast(`Na tahu je ${nameOf(display.currentPlayerId ?? '')}`);
        return;
      }
      if (!playable.has(key)) {
        showToast(
          display.pendingDraw > 0
            ? 'Teď můžeš jen přiložit sedmičku, nebo brát.'
            : legal?.canPass
              ? 'Můžeš zahrát jen líznutou kartu.'
              : 'Tahle karta nesedí barvou ani hodnotou.',
        );
        return;
      }
      // Touch: first tap lifts the card, second tap plays it.
      if (!CAN_HOVER && selected !== key) {
        setSelected(key);
        return;
      }
      if (key.endsWith('-Q')) {
        setPicking(key);
        return;
      }
      play(key);
    },
    [canAct, display.currentPlayerId, display.pendingDraw, display.phase, legal?.canPass, myTurnShown, nameOf, play, playable, selected],
  );

  const draw = useCallback(() => {
    if (canAct && legal?.canDraw) sendAction({ type: 'draw' });
  }, [canAct, legal?.canDraw]);
  const pass = useCallback(() => {
    if (canAct && legal?.canPass) sendAction({ type: 'pass' });
  }, [canAct, legal?.canPass]);

  // Tap on empty table clears the selection.
  const onTableClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setSelected(null);
  };

  // ---- placement -----------------------------------------------------------
  const ui: HandUi = { hovered: CAN_HOVER && canAct ? hovered : null, selected: selected ?? picking, pendingKey, playable, myTurn: canAct };
  const placed = placeAll(display, geo, ui);

  const fxFor = (p: PlacedCard): CardFx | undefined => {
    if (p.zone === 'discard' && p.entity.key === display.discard.at(-1)?.key) return { current: true };
    if (p.zone !== 'mine') return undefined;
    return {
      playable: canAct && playable.has(p.entity.key),
      dimmed: canAct && !playable.has(p.entity.key),
      selected: (selected ?? picking) === p.entity.key,
      pending: pendingKey === p.entity.key,
    };
  };

  const labels = fx.filter((f): f is Extract<FxItem, { kind: 'label' }> => f.kind === 'label');
  const winner = display.winnerId ? names.get(display.winnerId) : undefined;
  const showWin = display.phase === 'finished' && idle;

  return (
    <div className="table" ref={tableRef} onClick={onTableClick}>
      <div className="table-felt" style={{ top: geo.deck.y - geo.cardH * 1.15, height: geo.cardH * 2.3 }} />
      <AnimatePresence>
        {myTurnShown && display.phase === 'playing' && (
          <motion.div
            key="my-turn-glow"
            className="my-turn-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      <DeckStack geo={geo} count={display.drawCount} canDraw={!!legal?.canDraw} penalty={display.pendingDraw} onDraw={draw} />

      <CardLayer
        placed={placed}
        geo={geo}
        stamp={display.stamp}
        speed={speed}
        reduced={reducedMotion}
        fxFor={fxFor}
        hoverKey={hovered}
        interactive={(p) => p.zone === 'mine' && display.phase === 'playing' && !display.handCollapsed}
        onHover={setHovered}
        onActivate={activate}
      />

      {display.order
        .filter((id) => id !== me)
        .map((id) => (
          <Seat
            key={id}
            geo={geo}
            id={id}
            name={nameOf(id)}
            connected={names.get(id)?.connected ?? false}
            bot={names.get(id)?.bot ?? false}
            count={display.hands[id]?.length ?? 0}
            active={display.currentPlayerId === id}
            penalty={display.currentPlayerId === id ? display.pendingDraw : 0}
            fx={fx}
            reduced={reducedMotion}
          />
        ))}

      <CenterHud display={display} geo={geo} me={me} nameOf={nameOf} />

      {fx.map((f) => {
        if (f.kind === 'impact') return <Impact key={f.id} at={geo.discard} tone={f.tone} delay={f.delay * speed} lite={lite || reducedMotion} cardW={geo.cardW} />;
        return null;
      })}
      <EffectOrchestrator items={fx.filter((f): f is EffectInstance => f.kind === 'effect')} geo={geo} me={me} reduced={reducedMotion} lite={lite} />
      <ActionLabel item={labels.at(-1)} at={{ x: geo.w / 2, y: geo.labelY }} />

      <StatusBar
        geo={geo}
        display={display}
        me={me}
        nameOf={nameOf}
        canAct={canAct}
        canDraw={!!legal?.canDraw}
        canPass={!!legal?.canPass}
        hasPlayable={playable.size > 0}
        onDraw={draw}
        onPass={pass}
        hit={fx.some((f) => f.kind === 'hit' && f.playerId === me)}
        reduced={reducedMotion}
        wins={names.get(me)?.wins ?? 0}
        myName={nameOf(me)}
      />

      <SuitPicker
        open={!!picking}
        onPick={(suit) => {
          const key = picking;
          setPicking(null);
          if (key) play(key, suit);
        }}
        onCancel={() => setPicking(null)}
      />

      <AnimatePresence>
        {showWin && (
          <motion.div className="win-backdrop" key="win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="win-panel"
              initial={{ y: 40, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}
            >
              <div className="win-kicker">Konec partie · kolo {room.round}</div>
              <h2 className="win-title brand-word">{display.winnerId === me ? 'Vyhráváš!' : `${winner?.name ?? 'Hráč'} vyhrává`}</h2>
              <ul className="scoreboard">
                {[...room.players]
                  .sort((a, b) => b.wins - a.wins)
                  .map((p) => (
                    <li key={p.id} className={p.id === display.winnerId ? 'is-winner' : ''}>
                      <span className="avatar sm" style={{ background: avatarColor(p.id) }}>
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="sb-name">
                        {p.name}
                        {p.id === me && <em> (ty)</em>}
                      </span>
                      <span className="sb-wins">{p.wins}×</span>
                    </li>
                  ))}
              </ul>
              {room.hostId === me ? (
                <button className="btn btn-primary win-cta" onClick={rematch} disabled={pending || room.players.filter((p) => p.connected).length < 2}>
                  Hrát znovu
                </button>
              ) : (
                <p className="win-wait">Čeká se, až hostitel spustí odvetu…</p>
              )}
              <button className="btn btn-ghost" onClick={leaveRoom}>
                Odejít ze hry
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------

function DeckStack({ geo, count, canDraw, penalty, onDraw }: { geo: Geometry; count: number; canDraw: boolean; penalty: number; onDraw: () => void }) {
  const layers = Math.min(3, count);
  return (
    <div className="deck" style={{ left: geo.deck.x - geo.cardW / 2, top: geo.deck.y - geo.cardH / 2, width: geo.cardW, height: geo.cardH }}>
      {count === 0 && <div className="deck-empty">prázdný</div>}
      {Array.from({ length: layers }, (_, i) => (
        <div key={i} className="deck-card" style={{ transform: `translate(${-(layers - 1 - i) * 1.5}px, ${-(layers - 1 - i) * 1.5}px)` }}>
          <div className="card">
            <CardBack />
          </div>
        </div>
      ))}
      <button
        className={`deck-hit${canDraw ? (penalty ? ' is-penalty' : ' is-ready') : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onDraw();
        }}
        disabled={!canDraw}
        aria-label={penalty ? `Brát ${penalty} karty` : 'Líznout kartu'}
      />
      <div className="deck-count">{count}</div>
    </div>
  );
}

function Seat({
  geo,
  id,
  name,
  connected,
  bot,
  count,
  active,
  penalty,
  fx,
  reduced,
}: {
  geo: Geometry;
  id: string;
  name: string;
  connected: boolean;
  bot: boolean;
  count: number;
  active: boolean;
  penalty: number;
  fx: FxItem[];
  reduced: boolean;
}) {
  const seat = geo.seats[id];
  if (!seat) return null;
  const s = geo.oppScale;
  const top = seat.side === 'top' ? seat.y + geo.cardH * s * 0.5 + 10 : seat.y + geo.cardH * s * 0.9;
  const hit = fx.some((f) => f.kind === 'hit' && f.playerId === id);
  const skipped = fx.some((f) => f.kind === 'skip' && f.playerId === id);
  return (
    <motion.div
      className={`seat${active ? ' is-active' : ''}${connected ? '' : ' is-offline'}${skipped ? ' is-skipped' : ''}${count === 1 ? ' is-danger' : ''}`}
      style={{ left: seat.x, top }}
      animate={hit && !reduced ? MOTION_PRIMITIVES.shake : { x: 0 }}
      transition={primitiveTransition(.42)}
    >
      <motion.div
        key={active ? 'on' : 'off'}
        className="seat-inner"
        initial={active && !reduced ? { scale: 1.12 } : false}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      >
        <span className="avatar" style={{ background: avatarColor(id) }}>
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="seat-meta">
          <span className="seat-name">
            {name}
            {bot && <span className="seat-bot">bot</span>}
          </span>
          <span className="seat-count">
            {connected ? `${count} ${cardsWord(count)}` : 'bez spojení…'}
          </span>
        </span>
        {skipped && (
          <span className="seat-lock">
            <LockIcon />
          </span>
        )}
      </motion.div>
      <AnimatePresence>
        {penalty > 0 && (
          <motion.span
            key={penalty}
            className="seat-penalty"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 16 }}
          >
            +{penalty}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CenterHud({ display, geo, me, nameOf }: { display: Display; geo: Geometry; me: string; nameOf: (id: string) => string }) {
  const top = display.discard.at(-1)?.card;
  const suit = display.activeSuit;
  const forced = !!(suit && top && top.rank === 'Q');
  const target = display.currentPlayerId;
  return (
    <>
      {suit && display.phase !== 'idle' && (
        <div className="suit-anchor" style={{ left: geo.discard.x, top: geo.discard.y + geo.cardH / 2 + 16 }}>
          <motion.div
            key={suit}
            className={`suit-chip${forced ? ' is-forced' : ''}`}
            style={{ ['--suit-tone' as string]: SUIT_TONE[suit] }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 480, damping: 18 }}
            title="Platná barva"
          >
            <SuitIcon suit={suit} className="suit-chip-icon" />
            <span>{forced ? `hraje se ${suitName(suit)}` : suitName(suit)}</span>
          </motion.div>
        </div>
      )}
      <AnimatePresence>
        {display.pendingDraw > 0 && (
          <motion.div
            className="penalty-anchor"
            style={{ left: geo.discard.x + geo.cardW * 0.48, top: geo.discard.y - geo.cardH * 0.5 }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.25 } }}
          >
            <motion.div
              key={display.pendingDraw}
              className="penalty-badge"
              initial={{ scale: 1.7, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 13 }}
            >
              +{display.pendingDraw}
            </motion.div>
            {target && <div className="penalty-target">→ {target === me ? 'tobě' : nameOf(target)}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatusBar({
  geo,
  display,
  me,
  nameOf,
  canAct,
  canDraw,
  canPass,
  hasPlayable,
  onDraw,
  onPass,
  hit,
  reduced,
  wins,
  myName,
}: {
  geo: Geometry;
  display: Display;
  me: string;
  nameOf: (id: string) => string;
  canAct: boolean;
  canDraw: boolean;
  canPass: boolean;
  hasPlayable: boolean;
  onDraw: () => void;
  onPass: () => void;
  hit: boolean;
  reduced: boolean;
  wins: number;
  myName: string;
}) {
  const current = display.currentPlayerId;
  const mine = current === me;
  let text = '';
  if (display.phase === 'finished') text = 'Partie skončila';
  else if (!current) text = 'Rozdávám…';
  else if (mine) {
    if (display.pendingDraw > 0) text = hasPlayable ? `Přilož sedmičku, nebo ber ${display.pendingDraw}` : `Ber ${display.pendingDraw} ${cardsWord(display.pendingDraw)}`;
    else if (canPass) text = hasPlayable ? 'Zahraj líznutou kartu, nebo nehraj' : 'Nehraješ';
    else text = hasPlayable || !canAct ? 'Hraješ ty' : 'Hraješ ty — lízni si';
  } else text = display.pendingDraw > 0 ? `${nameOf(current)}: sedmička, nebo +${display.pendingDraw}` : `Na tahu: ${nameOf(current)}`;

  return (
    <motion.div
      className={`status-bar${mine && display.phase === 'playing' ? ' is-mine' : ''}`}
      style={{ top: geo.handTop - 62, width: Math.min(geo.w - 16, 640) }}
      animate={hit && !reduced ? MOTION_PRIMITIVES.shake : { x: 0 }}
      transition={primitiveTransition(.42)}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="avatar sm" style={{ background: avatarColor(me) }} title={myName}>
        {myName.slice(0, 1).toUpperCase()}
      </span>
      <motion.span
        key={`${current}-${display.pendingDraw}-${canPass}`}
        className="status-text"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        {text}
      </motion.span>
      {display.phase === 'playing' && display.hands[me]?.length === 1 && <span className="last-card-badge">POSLEDNÍ KARTA</span>}
      {wins > 0 && <span className="status-wins" title="Tvoje výhry">{wins}×</span>}
      <span className="status-actions">
        {canAct && canPass && (
          <button className="btn btn-secondary btn-sm" onClick={onPass}>
            Nehraju
          </button>
        )}
        {canAct && canDraw && (
          <button className={`btn btn-sm ${display.pendingDraw > 0 ? 'btn-danger' : 'btn-primary'}`} onClick={onDraw}>
            {display.pendingDraw > 0 ? `Brát ${display.pendingDraw}` : 'Líznout'}
          </button>
        )}
      </span>
    </motion.div>
  );
}
