import { useState, type CSSProperties, type ReactNode } from 'react';
import type { RoomPlayerView } from '@balik/shared';
import { useMotionPref } from '../lib/motionPref';
import { avatarFor } from './catalog';
import { turnText, type AvatarTurn } from './status';
import './avatars.css';

export function AvatarStatusRing() {
  return <span className="player-avatar-ring" aria-hidden />;
}
/** Neutral backs belong to BALÍK, independent of the selected edition. */
export function AvatarThinkingState() {
  return (
    <span className="avatar-thinking" aria-hidden>
      {[0, 1, 2].map((i) => (
        <i key={i} style={{ '--i': i } as CSSProperties}>
          <b>◆</b>
        </i>
      ))}
    </span>
  );
}
export interface AvatarProps {
  player: Pick<RoomPlayerView, 'id' | 'name'> & Partial<RoomPlayerView>;
  size?: number;
  turn?: AvatarTurn;
  winner?: boolean;
  danger?: boolean;
  ready?: boolean;
  reduced?: boolean;
  reaction?: ReactNode;
}
export function Avatar({
  player,
  size = 40,
  turn = 'idle',
  winner = false,
  danger = false,
  ready = false,
  reduced,
  reaction,
}: AvatarProps) {
  const pref = useMotionPref();
  const art = avatarFor(player.avatarId, player.id, player.bot);
  const [failed, setFailed] = useState<string | null>(null);
  const offline = player.connected === false;
  const actualTurn = offline ? 'idle' : turn;
  const status = [
    turnText(actualTurn),
    player.bot && 'Počítač',
    offline && 'Odpojeno',
    winner && 'Vítěz',
    danger && 'Poslední karta',
    ready && 'Připraveno',
  ]
    .filter(Boolean)
    .join(' · ');
  const badge = winner ? '★' : offline ? '!' : player.bot ? '◆' : danger ? '1' : ready ? '✓' : null;
  const botBadge = player.bot && !winner && !offline;
  return (
    <span
      className="player-avatar"
      data-avatar={art.id}
      data-turn={actualTurn}
      data-offline={offline}
      data-winner={winner}
      data-danger={danger}
      data-reduced={reduced ?? pref.reduced}
      style={{ '--avatar-size': `${size}px`, '--avatar-color': art.themeColor } as CSSProperties}
      role="img"
      aria-label={`${player.name}${status ? ` · ${status}` : ''}`}
    >
      <span className="player-avatar-disk">
        <span className="player-avatar-portrait">
          {failed === art.asset ? (
            <span className="player-avatar-fallback">{player.name.slice(0, 1).toLocaleUpperCase('cs')}</span>
          ) : (
            <img
              src={art.asset}
              alt=""
              draggable={false}
              decoding="async"
              width="192"
              height="192"
              onError={() => setFailed(art.asset)}
            />
          )}
        </span>
      </span>
      <AvatarStatusRing />
      <AvatarThinkingState />
      {badge && (
        <span className={`player-avatar-badge${botBadge ? ' is-bot' : ''}`} aria-hidden>
          {botBadge ? (
            <svg
              viewBox="0 0 20 20"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="5" y="5" width="10" height="10" rx="2" />
              <path d="M8 2v3m4-3v3m-4 10v3m4-3v3M2 8h3m-3 4h3m10-4h3m-3 4h3" />
            </svg>
          ) : (
            badge
          )}
        </span>
      )}
      {reaction && <span className="player-avatar-reaction">{reaction}</span>}
    </span>
  );
}
export function AvatarTurnLabel({ turn }: { turn: AvatarTurn }) {
  return turn === 'idle' ? null : <small className="avatar-turn-label">{turnText(turn)}</small>;
}
