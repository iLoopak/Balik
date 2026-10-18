import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { AnyRoomView, GameId, Suit } from '@balik/shared';
import { Avatar, AvatarTurnLabel } from '../avatars/Avatar';
import { avatarTurn } from '../avatars/status';
import { BrandResults, type ResultOutcome } from '../brand/BrandResults';
import { EmoteBubble, ResultReactions, useEmotes } from '../brand/Emotes';
import { useElementSize } from '../lib/useElementSize';
import { eveningAction, leaveRoom, rematch, returnToLobby } from '../net/client';
import { useApp } from '../net/store';
import { CardLayer } from '../table/CardLayer';
import { GameTableTheme } from '../table/GameTableTheme';
import type { EnvironmentPulse } from '../table/environment';
import { computeGeometry, type Geometry, type PlacedCard } from '../table/layout';
import type { CardFx } from '../cards/Card';
import '../table/table.css';
import './games.css';

/** Table geometry for a game: seats in turn order, my hand at the bottom. */
export function useGameGeometry(order: string[], me: string, handCount: number, adjust?: (geo: Geometry) => Geometry) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const geo = useMemo(() => {
    const base = computeGeometry(size.width || 360, size.height || 560, order, me, handCount);
    return adjust ? adjust(base) : base;
    // `adjust` is a pure layout tweak defined per game; its identity does not matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, order.join(','), me, handCount]);
  return { ref, geo };
}

export interface SeatInfo { sub?: string; badge?: string; tone?: 'danger' | 'good' | 'muted' }
export interface ShellControls { title: string; sub?: string; actions?: ReactNode }

/**
 * Common frame for the games added after Lhář: console, seats, the animated card layer,
 * a control bar above my hand, emotes and the results dialog. Each game supplies the
 * placements, its centre overlays and its controls.
 */
export function GameShell({ room, gameId, tableRef, geo, placed, stamp, lite, reducedMotion, fxFor, interactive, hovered, onHover, onActivate,
  environment, drawCount, suit = null, myTurn, activeId, seatInfo, controls, top, children, outcome, finished, idle, apparatus = true }: {
  room: AnyRoomView; gameId: GameId; tableRef: (el: HTMLDivElement | null) => void; geo: Geometry; placed: PlacedCard[]; stamp: number;
  lite: boolean; reducedMotion: boolean; fxFor: (p: PlacedCard) => CardFx | undefined; interactive: (p: PlacedCard) => boolean;
  hovered: string | null; onHover: (key: string | null) => void; onActivate: (key: string) => void;
  environment: readonly EnvironmentPulse[]; drawCount?: number; suit?: Suit | null; myTurn: boolean; activeId: string | null;
  seatInfo: (id: string) => SeatInfo; controls: ShellControls; top?: ReactNode; children?: ReactNode;
  outcome: ResultOutcome | null; finished: boolean; idle: boolean; apparatus?: boolean;
}) {
  const me = room.you;
  const quiet = reducedMotion || lite;
  const pending = useApp((s) => s.pending);
  const status = useApp((s) => s.status);
  const emotes = useEmotes(room.code);
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Odpojený hráč';
  const person = (id: string) => room.players.find((p) => p.id === id) ?? { id, name: name(id) };
  const opponents = Object.keys(geo.seats);
  return <section className={`game-shell game-shell-${gameId}`} aria-label={gameId}>
    {top && <div className="game-shell-top">{top}</div>}
    <div className={`table game-shell-table${apparatus ? '' : ' is-open-table'}`} ref={tableRef} data-game={gameId} data-idle={idle} data-quiet={quiet}>
      <GameTableTheme game={gameId} you={me} geo={geo} suit={suit} reduced={reducedMotion} lite={lite} myTurn={myTurn} active={activeId}
        drawCount={drawCount} pulses={environment} apparatus={apparatus} />
      {opponents.map((id) => {
        const seat = geo.seats[id]!;
        const info = seatInfo(id);
        const message = emotes.find((m) => m.playerId === id);
        const turn = avatarTurn(room, id, status === 'open');
        return <div key={id} className={`game-seat${activeId === id ? ' is-current' : ''}${info.tone ? ` is-${info.tone}` : ''}`}
          style={seat.side === 'top' ? { left: seat.x, top: seat.y + geo.cardH * geo.oppScale * .56 + 8 } : { left: seat.x, top: seat.y + geo.cardH * .45 }}>
          <Avatar player={person(id)} size={geo.short ? 26 : 32} turn={turn} reduced={quiet} />
          <span><b>{name(id)}</b><AvatarTurnLabel turn={turn} />{info.sub && <small>{info.sub}</small>}</span>
          {info.badge && <em className="game-seat-badge">{info.badge}</em>}
          {message && <EmoteBubble message={message} author={name(id)} />}
        </div>;
      })}
      <CardLayer game={gameId} placed={placed} geo={geo} stamp={stamp} speed={quiet ? .15 : 1} reduced={quiet} fxFor={fxFor}
        hoverKey={hovered} interactive={interactive} onHover={onHover} onActivate={onActivate} />
      {children}
      <div className={`game-controls${myTurn ? ' is-mine' : ''}`} style={{ top: geo.controlY }}>
        <Avatar player={person(me)} size={30} turn={avatarTurn(room, me, status === 'open')} reduced={quiet} />
        <span className="game-controls-copy" role="status"><b>{controls.title}</b>{controls.sub && <small>{controls.sub}</small>}</span>
        {controls.actions && <span className="game-controls-actions">{controls.actions}</span>}
        {emotes.filter((m) => m.playerId === me).map((m) => <EmoteBubble key={m.id} message={m} author={name(me)} mine />)}
      </div>
      <AnimatePresence>
        {finished && idle && outcome && <motion.div className="game-results-wrap" key="results" initial={quiet ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="win-panel"><BrandResults room={room} outcome={outcome} winnerId={outcome.winnerIds[0] ?? null} pending={pending} reduced={quiet}
            onRematch={rematch} onLobby={returnToLobby} onLeave={leaveRoom} onChangeGame={() => eveningAction('openVote')} onCloseEvening={() => eveningAction('close')}
            reactions={<ResultReactions room={room} messages={emotes} />} /></div>
        </motion.div>}
      </AnimatePresence>
    </div>
  </section>;
}

/** A centred caption chip on the table, e.g. a trump indicator or a running score. */
export function TableChip({ x, y, children, tone }: { x: number; y: number; children: ReactNode; tone?: 'accent' | 'danger' | 'good' }) {
  return <div className={`table-chip${tone ? ` is-${tone}` : ''}`} style={{ left: x, top: y }}>{children}</div>;
}
