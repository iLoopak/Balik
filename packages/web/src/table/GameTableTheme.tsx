import { useId, type CSSProperties } from 'react';
import type { GameId, Suit } from '@balik/shared';
import { useColorMode, type ColorMode } from '../themes/colorMode';
import { lightEffectInk } from '../themes/colorContrast';
import { TABLE_THEMES, type TableId } from '../themes/registry';
import { useAppearance } from '../themes/preferences';
import { BrandMascot } from '../brand/BrandMascot';
import { useBrandPreferences } from '../brand/preferences';
import { ConsoleReactions } from './ConsoleReactions';
import { ConsoleWiringOver, ConsoleWiringUnder, consoleWiring } from './ConsoleWiring';
import { CONSOLE_LABELS, consolePocket, type EnvironmentPulse } from './environment';
import type { Geometry } from './layout';
import './arena.css';
import './console.css';

// Both profiles share the packet notch and chamfer language of the BALÍK apparatus.
export const CONSOLE_FRAMES = {
  oval: [
    'M66 20H934L980 66V336L936 380H580L548 408H452L420 380H64L20 336V66Z',
    'M80 46H920L954 80V318L917 354H83L46 318V80Z',
  ],
  cabinet: [
    'M62 20H938V42H960V64H980V334H960V356H938V380H580L548 408H452L420 380H62V358H40V336H20V64H40V42H62Z',
    'M84 48H916V68H946V316H916V352H84V326H48V84H84Z',
  ],
};
const AMBIENT: Record<Suit, string> = {
  hearts: 'm22 19 5-13 6 13-6-5Zm39-2 4-10 5 10-5-4Zm39 2 5-13 5 13-5-5Z',
  diamonds: 'M12 12h29m-8-6 8 6-8 6m21-6h29m-8-6 8 6-8 6m21-6h29m-8-6 8 6-8 6',
  clubs: 'M14 18q13-23 24-10-4 13-24 10Zm44 0q13-23 24-10-4 13-24 10Zm44 0q13-23 24-10-4 13-24 10Z',
  spades: 'm12 14 18-9-7 12 21-6m10 3 18-9-7 12 21-6m10 3 18-9-7 12 21-6',
};
export interface GameTableThemeProps {
  geo: Geometry;
  suit: Suit | null;
  reduced: boolean;
  lite: boolean;
  myTurn: boolean;
  theme?: TableId;
  colorMode?: ColorMode;
  game?: GameId;
  you?: string;
  drawCount?: number;
  pulses?: readonly EnvironmentPulse[];
  /** Player whose turn it is; their lane into the console carries the signal. */
  active?: string | null;
  /** False for games whose cards cover the whole table (Pexeso): no central console. */
  apparatus?: boolean;
}
/** Room → apparatus → receiving slots/ambient → cards → overlays. All decoration is inert. */
export function GameTableTheme({
  geo,
  suit,
  reduced,
  lite,
  myTurn,
  theme: override,
  colorMode: modeOverride,
  game = 'prsi',
  you = 'me',
  drawCount,
  pulses = [],
  active = null,
  apparatus = true,
}: GameTableThemeProps) {
  const selected = useAppearance((p) => p.table),
    selectedMode = useColorMode((p) => p.mode);
  const showMascot = useBrandPreferences((p) => p.mascot);
  const theme = TABLE_THEMES[override ?? selected],
    mode = modeOverride ?? selectedMode;
  const material = mode === 'light' ? theme.light : theme;
  const accent = suit ? theme.colors[suit] : '#FFB23F';
  const color = mode === 'light' ? lightEffectInk(accent, material.surface) : accent;
  const quiet = reduced || lite;
  const textureId = useId().replace(/:/g, '');
  const labels = CONSOLE_LABELS[game];
  const width = Math.min(geo.w * 0.94, Math.max(geo.cardW * 5.8, geo.w * 0.54));
  const height = Math.min(geo.h * 0.55, geo.pileH * 1.9);
  const wiring = consoleWiring(geo, game, { cx: geo.w / 2, cy: geo.discard.y, width, height });
  const last = pulses.at(-1)?.kind;
  const mascotState =
    last === 'win'
      ? 'celebrate'
      : last === 'penalty'
        ? 'surprised'
        : last === 'draw' || last === 'deal' || last === 'collect'
          ? 'deal'
          : last === 'challenge'
            ? 'thinking'
            : 'idle';
  return (
    <div
      className={`game-table-theme console-table table-geometry-${theme.geometry}${quiet ? ' arena-is-quiet' : ''}${myTurn ? ' arena-my-turn' : ''}`}
      aria-hidden="true"
      data-environment="dealer-console"
      data-game={game}
      data-color-mode={mode}
      data-table-theme={theme.id}
      data-suit={suit ?? 'neutral'}
      data-ambient={quiet ? 'static' : geo.compact ? 'subtle' : 'full'}
      style={
        {
          '--arena-faction': color,
          '--arena-secondary': material.secondary,
          '--arena-background': material.background,
          '--arena-surface': material.surface,
          '--arena-rail': material.rail,
          '--arena-grid': material.grid,
        } as CSSProperties
      }
    >
      <div className="arena-grid" />
      <div className="arena-edge-light" />
      {Object.entries(geo.seats).map(([id, seat]) => (
        <div
          key={id}
          className="arena-seat-dock"
          style={{
            left: seat.x,
            top: seat.y,
            width: Math.min(geo.w * 0.26, geo.cardW * geo.oppScale * 2.4),
            height: geo.cardH * geo.oppScale * 1.16,
          }}
        />
      ))}
      {apparatus && <>
      <ConsoleWiringUnder geo={geo} wiring={wiring} active={active} myTurn={myTurn} />
      <div
        className="arena-stage console-stage"
        style={{ left: geo.w / 2, top: geo.discard.y, width, height }}
      >
        <div className="arena-stage-underlight" />
        <svg
          className="arena-stage-structure"
          viewBox="0 0 1000 420"
          preserveAspectRatio="none"
          data-console-frame={theme.geometry}
        >
          <defs>
            <pattern id={textureId} width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M0 1h8M1 0v8" fill="none" stroke="currentColor" strokeWidth=".35" />
            </pattern>
          </defs>
          <path
            className="console-cast-shadow"
            d={CONSOLE_FRAMES[theme.geometry][0]}
            transform="translate(0 9)"
          />
          <path className="console-shell" d={CONSOLE_FRAMES[theme.geometry][0]} />
          <path className="arena-surface" d={CONSOLE_FRAMES[theme.geometry][1]} />
          <path
            className="arena-material-grain"
            d={CONSOLE_FRAMES[theme.geometry][1]}
            fill={`url(#${textureId})`}
          />
          <path className="arena-rail-outer" d={CONSOLE_FRAMES[theme.geometry][0]} />
          <path className="arena-rail-inner" d={CONSOLE_FRAMES[theme.geometry][1]} />
          <path className="console-packet-seal" d="m450 380 50 28 50-28m-31 7h-38m8 8h22" />
          <path
            className="console-corner-tabs"
            d="M66 28h60M28 66v34m846-72h60m38 38v34M66 372h60m748 0h60"
          />
        </svg>
        <div className="console-dealer-plate">
          {showMascot && <BrandMascot state={mascotState} size={28} reduced={quiet} />}
          <span>
            <b>BALÍK</b>
            <small>KARETNÍ STROJ</small>
          </span>
          <i className={myTurn ? 'is-active' : ''} />
        </div>
        {suit && (
          <div className="console-energy-meter">
            <span>PULS BALÍKU</span>
            <svg viewBox="0 0 140 24" className="console-ambient" data-motion={quiet ? 'off' : 'on'}>
              <path d={AMBIENT[suit]} fill="none" />
            </svg>
          </div>
        )}
      </div>
      {labels.input && (
        <ConsoleSlot
          geo={geo}
          game={game}
          kind="draw"
          label={drawCount === 0 ? 'DOBRÁNO' : labels.input}
          count={drawCount || undefined}
          empty={drawCount === 0}
        />
      )}
      <ConsoleSlot geo={geo} game={game} kind="play" label={labels.output} />
      <ConsoleWiringOver geo={geo} wiring={wiring} drawCount={drawCount} />
      </>}
      <ConsoleReactions geo={geo} pulses={pulses} game={game} quiet={quiet} you={you} />
      <div className="arena-hand-light" style={{ top: geo.handTop, height: geo.h - geo.handTop }} />
    </div>
  );
}
function ConsoleSlot({
  geo,
  game,
  kind,
  label,
  count,
  empty = false,
}: {
  geo: Geometry;
  game: GameId;
  kind: 'draw' | 'play';
  label: string;
  /** Stock readout: the slot itself tells how many cards are left. */
  count?: number;
  empty?: boolean;
}) {
  const pocket = consolePocket(geo, game, kind);
  return (
    <div
      className={`arena-pile-dock console-slot console-slot-${kind}`}
      data-console-slot={kind}
      data-empty={empty}
      style={{ left: pocket.x, top: pocket.y, width: pocket.width, height: pocket.height }}
    >
      <span className={`console-slot-name${pocket.x < 72 ? ' is-edge' : ''}`}>
        <i />
        {label}
        {count !== undefined && <b className="console-slot-count">{count}</b>}
      </span>
      <span className="console-slot-teeth" />
      <span className="console-slot-lip" />
    </div>
  );
}
