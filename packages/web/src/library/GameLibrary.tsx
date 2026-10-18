import { useRef, type KeyboardEvent } from 'react';
import { GAME_IDS, GAME_INFO, ROOM_MAX_PLAYERS, type GameId } from '@balik/shared';
import { GameMotif } from './GameMotif';
import './library.css';

/** Seat counts the registry supports at all, e.g. 1–4. */
export const SEAT_OPTIONS = Array.from({ length: ROOM_MAX_PLAYERS }, (_, i) => i + 1)
  .filter((n) => GAME_IDS.some((id) => GAME_INFO[id].players.includes(n)));

export const fitsSeats = (id: GameId, seats: number | null) => seats === null || GAME_INFO[id].players.includes(seats);

/** Which computer opponents to offer first: the table size asked for, else the game's first option. */
export function defaultBots(id: GameId, seats: number | null, current?: number) {
  const counts = GAME_INFO[id].botCounts;
  if (seats !== null && counts.includes(seats - 1)) return seats - 1;
  if (current !== undefined && counts.includes(current)) return current;
  return counts[0]!;
}

/**
 * The game library: every registered game as a title with its own motif.
 * Built from GAME_IDS / GAME_INFO only, so a game added to the registry appears here.
 */
export function GameLibrary({ selected, onSelect, seats, reduced = false }: {
  selected: GameId; onSelect: (id: GameId) => void; seats: number | null; reduced?: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  // Arrow keys move between titles like a radio group; Tab leaves the group.
  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = GAME_IDS[(GAME_IDS.indexOf(selected) + step + GAME_IDS.length) % GAME_IDS.length]!;
    onSelect(next);
    list.current?.querySelector<HTMLButtonElement>(`[data-game="${next}"]`)?.focus();
  };
  return (
    <div ref={list} className={`library${reduced ? ' is-reduced' : ''}`} role="radiogroup" aria-label="Vyber hru" onKeyDown={onKey}>
      {GAME_IDS.map((id) => {
        const info = GAME_INFO[id], on = id === selected, fits = fitsSeats(id, seats);
        return (
          <button key={id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-game={id}
            className={`library-title motif-host is-${id}${on ? ' is-on' : ''}${fits ? '' : ' is-unfit'}`}
            aria-label={info.name} aria-describedby={fits ? `meta-${id}` : `meta-${id} unfit-${id}`} onClick={() => onSelect(id)}>
            <span className="library-art"><GameMotif id={id} /></span>
            <span className="library-name">{info.name}</span>
            <span className="library-meta" id={`meta-${id}`}>{info.playersLabel}</span>
            {!fits && <span className="library-unfit" id={`unfit-${id}`}>{info.needPlayers}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** "Kolik vás bude u stolu?" — dims games that cannot start with that many seats. */
export function SeatFilter({ seats, onChange }: { seats: number | null; onChange: (seats: number | null) => void }) {
  return (
    <div className="seat-filter" role="radiogroup" aria-label="Kolik vás bude u stolu, včetně počítače">
      <span className="seat-filter-label">U stolu</span>
      <button type="button" role="radio" aria-checked={seats === null} className={seats === null ? 'is-on' : ''} onClick={() => onChange(null)}>Vše</button>
      {SEAT_OPTIONS.map((n) => (
        <button key={n} type="button" role="radio" aria-checked={seats === n} className={seats === n ? 'is-on' : ''} onClick={() => onChange(n)}
          aria-label={`${n} ${n === 1 ? 'hráč' : 'hráči'}`}>{n}</button>
      ))}
    </div>
  );
}
