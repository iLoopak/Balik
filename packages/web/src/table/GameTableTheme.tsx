import type { CSSProperties } from 'react';
import type { Suit } from '@balik/shared';
import { SUIT_FACTION, type FactionId } from '../decks/stormpunk/tokens';
import { FACTION_EFFECTS } from '../effects/effectTokens';
import type { Geometry } from './layout';
import './arena.css';

/** Static structural geometry plus a bounded, independently disabled ambient layer. */
export function GameTableTheme({ geo, suit, reduced, lite, myTurn }: {
  geo: Geometry; suit: Suit | null; reduced: boolean; lite: boolean; myTurn: boolean;
}) {
  const faction = suit ? SUIT_FACTION[suit] : null;
  const color = faction ? FACTION_EFFECTS[faction].color : '#FFB23F';
  const secondary = faction ? FACTION_EFFECTS[faction].secondary : '#FFE5AF';
  const quiet = reduced || lite;
  return <div className={`game-table-theme${quiet ? ' arena-is-quiet' : ''}${myTurn ? ' arena-my-turn' : ''}`} aria-hidden="true"
    data-faction={faction ?? 'neutral'} data-ambient={quiet ? 'static' : geo.compact ? 'subtle' : 'full'}
    style={{ '--arena-faction': color, '--arena-secondary': secondary } as CSSProperties}>
    <div className="arena-grid" />
    <div className="arena-edge-light" />
    <PlayZone geo={geo} faction={faction} quiet={quiet} />
    <div className="arena-hand-light" style={{ top: geo.handTop, height: geo.h - geo.handTop }} />
  </div>;
}

function PlayZone({ geo, faction, quiet }: { geo: Geometry; faction: FactionId | null; quiet: boolean }) {
  const width = Math.min(geo.w * .94, Math.max(geo.cardW * 5.8, geo.w * .54));
  const height = Math.min(geo.h * .55, geo.pileH * 1.9);
  return <>
    <div className="arena-stage" style={{ left: geo.w / 2, top: geo.discard.y, width, height }}>
      <div className="arena-stage-underlight" />
      <svg className="arena-stage-structure" viewBox="0 0 1000 420" preserveAspectRatio="none">
        <ellipse className="arena-surface" cx="500" cy="210" rx="482" ry="189" />
        <ellipse className="arena-rail-outer" cx="500" cy="210" rx="482" ry="189" />
        <ellipse className="arena-rail-inner" cx="500" cy="210" rx="453" ry="166" />
        <path className="arena-amber-segment" d="M85 117C183 41 348 21 500 21M500 399c152 0 317-20 415-96" />
        <path className="arena-energy-segment" d="M85 303C35 269 18 239 18 210M915 117c50 34 67 64 67 93" />
        <path className="arena-circuits" d="M0 210h81l28-27h72m819 27h-81l-28 27h-72M305 41v23l22 19h58m230 254h58l22 19v23" />
        <path className="arena-ticks" d="M500 21v10m0 358v10M18 210h13m938 0h13M155 78l8 7m674 250 8 7M155 342l8-7m674-250 8-7" />
      </svg>
      <span className="arena-wordmark">BALÍK<span>TVŮJ BALÍK. TVŮJ SVĚT.</span></span>
      <AmbientFactionLayer faction={faction} quiet={quiet} />
    </div>
    <div className="arena-pile-dock arena-deck-dock" style={{ left: geo.deck.x, top: geo.deck.y, width: geo.deckW * 1.23, height: geo.deckH * 1.13 }} />
    <div className="arena-pile-dock arena-discard-dock" style={{ left: geo.discard.x, top: geo.discard.y, width: geo.pileW * 1.25, height: geo.pileH * 1.18 }} />
  </>;
}

function AmbientFactionLayer({ faction, quiet }: { faction: FactionId | null; quiet: boolean }) {
  if (!faction) return null;
  return <svg className={`arena-ambient arena-ambient-${faction}`} viewBox="0 0 1000 420" preserveAspectRatio="none" data-motion={quiet ? 'off' : 'on'}>
    {faction === 'vyhen' && <g className="arena-embers"><path d="m210 272 4 8-4 9-4-9Z" /><path d="m781 130 3 6-3 8-3-8Z" /><path d="m305 330 3 5-3 7-3-7Z" /></g>}
    {faction === 'pohyb' && <g className="arena-flow" fill="none"><path d="M130 270h78m-55 8h31m606-128h78m-55-8h31" /><path d="m199 266 5 4-5 4m599-128-5 4 5 4" /></g>}
    {faction === 'podrost' && <g className="arena-growth"><path d="M188 278q25-29 41-13-1 22-41 13Zm613-140q-25 29-41 13 1-22 41-13Z" fill="none" /><path d="m190 277 32-10m577-127-32 10" fill="none" /></g>}
    {faction === 'boure' && <g className="arena-electric" fill="none"><path d="m185 263 18 2-9 14 25-2m593-127-18-2 9-14-25 2" /><path d="M210 283h10m560-150h10" /></g>}
  </svg>;
}
