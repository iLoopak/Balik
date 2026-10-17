import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { legalMovesFromView, type RoomView, type Suit } from '@balik/shared';
import type { CardFx } from '../cards/Card';
import { CardBack } from '../cards/Card';
import { SuitIcon } from '../cards/SuitIcon';
import { SUIT_TONE } from '../cards/skin';
import { leaveRoom, rematch, returnToLobby, sendAction } from '../net/client';
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
import { GameTableTheme } from './GameTableTheme';
import './table.css';
import { BrandMascot } from '../brand/BrandMascot';
import { BrandResults } from '../brand/BrandResults';
import { EmoteBubble, useEmotes } from '../brand/Emotes';
import { useBrandPreferences } from '../brand/preferences';
import { brandAudio } from '../brand/audio';

const CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function Table({ room, reducedMotion }: { room: RoomView; reducedMotion: boolean }) {
  const emotes = useEmotes(room.code);
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
        brandAudio.play('select');
        setSelected(key);
        return;
      }
      if (key.endsWith('-Q')) {
        brandAudio.play('select');
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
  const ui: HandUi = { hovered: canAct ? hovered : null, selected: selected ?? picking, pendingKey, playable, myTurn: canAct };
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
  const showWin = display.phase === 'finished' && idle;

  return (
    <div className={`table command-table${geo.short ? ' table-short' : ''}`} ref={tableRef} onClick={onTableClick}>
      <GameTableTheme geo={geo} suit={display.activeSuit} reduced={reducedMotion} lite={lite} myTurn={myTurnShown} />
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
        reduced={reducedMotion || lite}
        wins={names.get(me)?.wins ?? 0}
        myName={nameOf(me)}
      />

      {emotes.map((message) => {
        const mine = message.playerId === me;
        const seat = geo.seats[message.playerId];
        if (!mine && !seat) return null;
        const x = mine ? Math.max(70, geo.w / 2 - Math.min(geo.w - 24, 620) / 2 + 30) : seat!.x;
        const y = mine ? geo.controlY - 8 : seat!.y + geo.cardH * geo.oppScale * (seat!.side === 'top' ? .5 : .9) + 56;
        return <div className={`emote-anchor${mine ? ' is-mine' : ''}`} style={{ left: x, top: y }} key={message.id}><EmoteBubble message={message} mine={mine} author={nameOf(message.playerId)} /></div>;
      })}

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
              <BrandResults room={room} winnerId={display.winnerId} pending={pending} reduced={reducedMotion} onRematch={rematch} onLobby={returnToLobby} onLeave={leaveRoom} />
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
    <div className="deck" style={{ left: geo.deck.x - geo.deckW / 2, top: geo.deck.y - geo.deckH / 2, width: geo.deckW, height: geo.deckH }}>
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
      <div className="deck-count">{count} <span>{cardsWord(count)}</span></div>
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
  const top = seat.side === 'top' ? seat.y + geo.cardH * s * 0.5 + (geo.short ? 6 : 10) : seat.y + geo.cardH * s * 0.9;
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
        <div className="suit-anchor" style={{ left: geo.suitBadge.x, top: geo.suitBadge.y }}>
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
            style={{ left: geo.discard.x + geo.pileW * 0.48, top: geo.discard.y - geo.pileH * 0.5 }}
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
  const mascot = useBrandPreferences((p) => p.mascot);
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
      style={{ top: geo.controlY, width: Math.min(geo.w - 24, 620), minHeight: geo.controlHeight }}
      animate={hit && !reduced ? MOTION_PRIMITIVES.shake : { x: 0 }}
      transition={primitiveTransition(.42)}
      onClick={(e) => e.stopPropagation()}
    >
      {mascot && (!mine || display.handCollapsed) ? <BrandMascot state={!current || display.handCollapsed ? 'deal' : display.pendingDraw > 0 ? 'surprised' : 'thinking'} size={28} reduced={reduced} /> : <span className="avatar sm" style={{ background: avatarColor(me) }} title={myName}>
        {myName.slice(0, 1).toUpperCase()}
      </span>}
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
