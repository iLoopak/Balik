import { useId, type CSSProperties } from 'react';
import { useColorMode, type ColorMode } from '../themes/colorMode';
import { lightEffectInk } from '../themes/colorContrast';
import type { Suit } from '@balik/shared';
import { TABLE_THEMES, type TableTheme, type TableId } from '../themes/registry';
import { useAppearance } from '../themes/preferences';
import type { Geometry } from './layout';
import './arena.css';

/** Static structural geometry plus a bounded, independently disabled ambient layer. */
export function GameTableTheme({
  geo,
  suit,
  reduced,
  lite,
  myTurn,
  theme: override,
  colorMode: modeOverride,
}: {
  geo: Geometry;
  suit: Suit | null;
  reduced: boolean;
  lite: boolean;
  myTurn: boolean;
  theme?: TableId;
  colorMode?: ColorMode;
}) {
  const selected = useAppearance((p) => p.table);
  const theme = TABLE_THEMES[override ?? selected];
  const selectedMode = useColorMode((p) => p.mode);
  const mode = modeOverride ?? selectedMode;
  const material = mode === 'light' ? theme.light : theme;
  const accent = suit ? theme.colors[suit] : '#FFB23F';
  const color = mode === 'light' ? lightEffectInk(accent, material.surface) : accent;
  const secondary = material.secondary;
  const quiet = reduced || lite;
  return (
    <div
      className={`game-table-theme table-geometry-${theme.geometry}${quiet ? ' arena-is-quiet' : ''}${myTurn ? ' arena-my-turn' : ''}`}
      aria-hidden="true"
      data-color-mode={mode}
      data-table-theme={theme.id}
      data-suit={suit ?? 'neutral'}
      data-ambient={quiet ? 'static' : geo.compact ? 'subtle' : 'full'}
      style={
        {
          '--arena-faction': color,
          '--arena-secondary': secondary,
          '--arena-background': material.background,
          '--arena-surface': material.surface,
          '--arena-rail': material.rail,
          '--arena-grid': material.grid,
        } as CSSProperties
      }
    >
      <div className="arena-grid" />
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
      <div className="arena-edge-light" />
      <PlayZone geo={geo} suit={suit} theme={theme} quiet={quiet} />
      <div className="arena-hand-light" style={{ top: geo.handTop, height: geo.h - geo.handTop }} />
    </div>
  );
}

const SURFACES = {
  oval: [
    'M18 210a482 189 0 1 0 964 0 482 189 0 1 0-964 0Z',
    'M47 210a453 166 0 1 0 906 0 453 166 0 1 0-906 0Z',
  ],
  cabinet: ['M62 21h876l44 44v290l-44 44H62l-44-44V65Z', 'M82 44h836l39 39v254l-39 39H82l-39-39V83Z'],
};
function PlayZone({
  geo,
  suit,
  theme,
  quiet,
}: {
  geo: Geometry;
  suit: Suit | null;
  theme: TableTheme;
  quiet: boolean;
}) {
  const textureId = useId().replace(/:/g, '');
  const width = Math.min(geo.w * 0.94, Math.max(geo.cardW * 5.8, geo.w * 0.54));
  const height = Math.min(geo.h * 0.55, geo.pileH * 1.9);
  return (
    <>
      <div className="arena-stage" style={{ left: geo.w / 2, top: geo.discard.y, width, height }}>
        <div className="arena-stage-underlight" />
        <svg className="arena-stage-structure" viewBox="0 0 1000 420" preserveAspectRatio="none">
          <defs>
            <pattern id={textureId} width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M0 1h8M1 0v8" fill="none" stroke="currentColor" strokeWidth=".35" />
            </pattern>
          </defs>
          <path className="arena-surface" d={SURFACES[theme.geometry][0]} />
          <path
            className="arena-material-grain"
            d={SURFACES[theme.geometry][0]}
            fill={`url(#${textureId})`}
          />
          <path className="arena-rail-outer" d={SURFACES[theme.geometry][0]} />
          <path className="arena-rail-inner" d={SURFACES[theme.geometry][1]} />
          <path
            className="arena-amber-segment"
            d="M85 117C183 41 348 21 500 21M500 399c152 0 317-20 415-96"
          />
          <path className="arena-energy-segment" d="M85 303C35 269 18 239 18 210M915 117c50 34 67 64 67 93" />
          <path
            className="arena-circuits"
            d="M0 210h81l28-27h72m819 27h-81l-28 27h-72M305 41v23l22 19h58m230 254h58l22 19v23"
          />
          <path
            className="arena-ticks"
            d="M500 21v10m0 358v10M18 210h13m938 0h13M155 78l8 7m674 250 8 7M155 342l8-7m674-250 8-7"
          />
        </svg>
        <span className="arena-wordmark">
          BALÍK<span>TVŮJ BALÍK. TVŮJ SVĚT.</span>
        </span>
        <AmbientLayer suit={suit} theme={theme} quiet={quiet} />
      </div>
      <div
        className="arena-pile-dock arena-deck-dock"
        style={{ left: geo.deck.x, top: geo.deck.y, width: geo.deckW * 1.23, height: geo.deckH * 1.13 }}
      />
      <div
        className="arena-pile-dock arena-discard-dock"
        style={{ left: geo.discard.x, top: geo.discard.y, width: geo.pileW * 1.25, height: geo.pileH * 1.18 }}
      />
    </>
  );
}

function AmbientLayer({ suit, theme, quiet }: { suit: Suit | null; theme: TableTheme; quiet: boolean }) {
  if (!suit) return null;
  return (
    <svg
      className="arena-ambient"
      viewBox="0 0 1000 420"
      preserveAspectRatio="none"
      data-motion={quiet ? 'off' : 'on'}
    >
      <g className="arena-flow" fill="none">
        <path d={theme.ambient[suit]} />
      </g>
    </svg>
  );
}
