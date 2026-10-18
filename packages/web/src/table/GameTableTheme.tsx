import { useId, useRef, type CSSProperties } from 'react';
import type { Suit } from '@balik/shared';
import { TABLE_THEMES, type ConsolePalette, type TableId, type TableTone } from '../themes/registry';
import { useAppearance } from '../themes/preferences';
import type { Geometry, Pt } from './layout';
import './arena.css';
import './tone.css';

/**
 * BALÍK console: one apparatus for every game and every deck. A draw slot and a stage are
 * recessed into a cut-corner plate, each player is wired to it by a port, and the own side
 * of the table is the front tray. Decks only paint the faction light; the shape is BALÍK's.
 */
export type ConsoleStage = { kind: 'piles' } | { kind: 'trick'; width: number; height: number; label: string };
/** Values that change when something happens on the table; each change wakes its slot once. */
export interface ConsoleBeat { play?: string | number | null; draw?: number }

const PILES: ConsoleStage = { kind: 'piles' };

export function GameTableTheme({ geo, suit, reduced, lite, myTurn, theme: override, tone: toneOverride, stage = PILES, active = null, beat }: {
  geo: Geometry; suit: Suit | null; reduced: boolean; lite: boolean; myTurn: boolean; theme?: TableId; tone?: TableTone;
  stage?: ConsoleStage; active?: string | null; beat?: ConsoleBeat;
}) {
  const selected = useAppearance(p => p.table);
  const selectedTone = useAppearance(p => p.tone);
  const theme = TABLE_THEMES[override ?? selected];
  const tone = toneOverride ?? selectedTone;
  const quiet = reduced || lite;
  const faction = suit ? theme.colors[suit] : theme.tones[tone].amber;
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = consoleGeometry(geo, stage, theme.cut);
  const wake = useWake(beat);
  return <div className={`game-table-theme console-tone-${tone} console-cut-${theme.cut}${quiet ? ' arena-is-quiet' : ''}${myTurn ? ' arena-my-turn' : ''}`} aria-hidden="true"
    data-table-theme={theme.id} data-tone={tone} data-suit={suit ?? 'neutral'} data-ambient={quiet ? 'static' : geo.compact ? 'subtle' : 'full'} data-motion={quiet ? 'off' : 'on'}
    style={{ ...paletteVars(theme.tones[tone]), '--arena-faction': faction, '--arena-secondary': theme.secondary, '--console-spot-y': `${(c.cy / Math.max(1, geo.h)) * 100}%` } as CSSProperties}>
    <div className="console-stage-glow" style={{ left: c.stage.x + c.stage.w / 2, top: c.stage.y + c.stage.h / 2, width: c.stage.w * 2.3, height: c.stage.h * 1.9 }} />
    <svg className="console" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`}>
      <defs>
        <pattern id={`${id}-lattice`} width="26" height="26" patternUnits="userSpaceOnUse"><path className="console-lattice" d="M13 7.5 18.5 13 13 18.5 7.5 13Z" /></pattern>
        <radialGradient id={`${id}-vignette`} cx="50%" cy={`${(c.cy / Math.max(1, geo.h)) * 100}%`} r="75%"><stop offset=".38" stopColor="#000" /><stop offset="1" stopColor="#fff" /></radialGradient>
        <mask id={`${id}-outer`}><rect width={geo.w} height={geo.h} fill={`url(#${id}-vignette)`} /></mask>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1"><stop className="console-face-top" offset="0" /><stop className="console-face-bottom" offset="1" /></linearGradient>
        <linearGradient id={`${id}-well`} x1="0" y1="0" x2="0" y2="1"><stop className="console-well-top" offset="0" /><stop className="console-well-bottom" offset="1" /></linearGradient>
        <linearGradient id={`${id}-tray`} x1="0" y1="0" x2="0" y2="1"><stop className="console-tray-top" offset="0" /><stop className="console-tray-bottom" offset="1" /></linearGradient>
        <filter id={`${id}-lift`} x="-20%" y="-30%" width="140%" height="180%"><feDropShadow className="console-shadow-flood" dx="0" dy={geo.compact ? 6 : 12} stdDeviation={geo.compact ? 8 : 16} /></filter>
        <clipPath id={`${id}-upper`}><rect x="0" y="0" width={geo.w} height={c.plate.y0 + (c.plate.y1 - c.plate.y0) * .32} /></clipPath>
      </defs>

      {/* Outer frame: the room the apparatus is mounted in. */}
      <rect className="console-lattice-field" width={geo.w} height={geo.h} fill={`url(#${id}-lattice)`} mask={`url(#${id}-outer)`} />
      <path className="console-frame" d={c.frame} />
      <path className="console-frame-keys" d={c.frameKeys} />
      <path className="console-rails" d={c.rails} />

      {/* Player zones: a pad per opponent, the front tray for me. */}
      {c.pads.map(p => <path key={p.id} className={`console-pad${p.id === active ? ' is-live' : ''}`} d={p.d} />)}
      <g filter={`url(#${id}-lift)`}><path className="console-tray" d={c.tray} fill={`url(#${id}-tray)`} /></g>
      <path className="console-tray-edge" d={c.trayEdge} />
      <path className="console-tray-live" d={c.trayLive} />

      {/* Ports: every seat is wired into the console. */}
      {c.lanes.map(l => <g key={l.id} className={`console-lane${l.id === active || (l.id === 'me' && myTurn) ? ' is-live' : ''}`}>
        <path className="console-lane-groove" d={l.d} /><path className="console-lane-signal" d={l.signal} />
      </g>)}

      {/* Central apparatus. */}
      <g filter={`url(#${id}-lift)`}><path className="console-rim" d={c.plateD} /></g>
      <path className="console-bezel" d={c.plateD} />
      <path className="console-face" d={c.plateD} fill={`url(#${id}-face)`} />
      <path className="console-highlight" d={c.plateD} clipPath={`url(#${id}-upper)`} />
      {c.channel && <rect className="console-channel" {...c.channel} fill={`url(#${id}-well)`} />}
      {c.deck && <Well r={c.deck} gradient={`url(#${id}-well)`} className="console-well-deck" />}
      <Well r={c.stage} gradient={`url(#${id}-well)`} className="console-well-stage" />
      <path className="console-seat-mark" d={diamond(c.stage.x + c.stage.w / 2, c.stage.y + c.stage.h / 2, Math.min(c.stage.w, c.stage.h) * .2)} />
      <path className="console-brackets" d={c.brackets} />
      {stage.kind === 'piles' && <rect className="console-indicator" x={c.indicator.x} y={c.indicator.y} width={c.indicator.w} height={3} rx={1.5} />}
      {c.gauge && <g className="console-gauge">{c.gauge.map((g, i) => <rect key={i} className={beat?.draw !== undefined && i < Math.ceil(Math.min(32, beat.draw) / 4) ? 'is-on' : ''} x={g.x} y={g.y} width={g.w} height={g.h} rx={1} />)}</g>}
      {c.hub && <g transform={`translate(${f(c.hub.x)} ${f(c.hub.y)})`}><g className="console-hub" key={`hub-${suit ?? 'none'}`}>
        <path className="console-hub-ring" d={diamond(0, 0, c.hub.s)} /><path className="console-hub-core" d={diamond(0, 0, c.hub.s * .42)} />
      </g></g>}
      {!geo.compact && c.labels.map(l => <text key={l.text} className="console-engrave" x={l.x} y={l.y} textAnchor="middle">{l.text}</text>)}

      {/* One-shot wakes, keyed by the table event that caused them. */}
      {wake.play !== undefined && <g key={`play-${wake.play}`} className="console-wake console-wake-play">
        <rect x={c.stage.x} y={c.stage.y} width={c.stage.w} height={c.stage.h} rx={c.stage.r} /><path d={c.brackets} />
      </g>}
      {wake.draw !== undefined && c.deck && <rect key={`draw-${wake.draw}`} className="console-wake console-wake-draw" x={c.deck.x} y={c.deck.y} width={c.deck.w} height={c.deck.h} rx={c.deck.r} />}
    </svg>
  </div>;
}

function Well({ r, gradient, className }: { r: Box; gradient: string; className: string }) {
  return <g className={`console-well ${className}`}>
    <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} fill={gradient} />
    <rect className="console-well-shade" x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} />
    <path className="console-well-lip" d={`M${r.x + r.r * .6} ${r.y + r.h}h${r.w - r.r * 1.2}`} />
  </g>;
}

// ---------------------------------------------------------------------------

/** Remembers the first values so a mount does not wake anything; later changes do. */
function useWake(beat: ConsoleBeat | undefined) {
  const first = useRef(beat);
  return {
    play: beat?.play !== undefined && beat.play !== null && beat.play !== first.current?.play ? beat.play : undefined,
    draw: beat?.draw !== undefined && beat.draw !== first.current?.draw ? beat.draw : undefined,
  };
}

function paletteVars(p: ConsolePalette): Record<string, string | number> {
  return {
    '--tt-bg': p.bg, '--tt-spot': p.spot, '--tt-frame': p.frame, '--tt-pattern': p.pattern,
    '--tt-bezel': p.bezel, '--tt-edge': p.edge, '--tt-face-top': p.faceTop, '--tt-face-bottom': p.faceBottom, '--tt-highlight': p.highlight,
    '--tt-well-top': p.wellTop, '--tt-well-bottom': p.wellBottom, '--tt-well-lip': p.wellLip,
    '--tt-line': p.line, '--tt-pad': p.pad, '--tt-tray-top': p.trayTop, '--tt-tray-bottom': p.trayBottom,
    '--tt-amber': p.amber, '--tt-shadow': p.shadow, '--tt-shadow-opacity': p.shadowOpacity, '--tt-engrave': p.engrave,
  };
}

interface Box { x: number; y: number; w: number; h: number; r: number }
interface Notch { edge: 'top' | 'bottom' | 'left' | 'right'; at: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const f = (n: number) => Math.round(n * 10) / 10;
const box = (at: Pt, w: number, h: number, r: number): Box => ({ x: at.x - w / 2, y: at.y - h / 2, w, h, r });
const diamond = (x: number, y: number, s: number) => `M${f(x)} ${f(y - s)}L${f(x + s)} ${f(y)}L${f(x)} ${f(y + s)}L${f(x - s)} ${f(y)}Z`;

/** Polygon with every vertex rounded by `r` (quadratic joints keep the cut-corner silhouette). */
function rounded(points: Pt[], r: number, closed = true): string {
  if (r <= 0) return `M${points.map(p => `${f(p.x)} ${f(p.y)}`).join('L')}${closed ? 'Z' : ''}`;
  const n = points.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = points[i]!;
    if (!closed && (i === 0 || i === n - 1)) { d += `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`; continue; }
    const a = points[(i - 1 + n) % n]!, b = points[(i + 1) % n]!;
    const la = Math.hypot(a.x - p.x, a.y - p.y), lb = Math.hypot(b.x - p.x, b.y - p.y);
    const k = Math.min(r, la / 2, lb / 2);
    const s = { x: p.x + (a.x - p.x) / la * k, y: p.y + (a.y - p.y) / la * k };
    const e = { x: p.x + (b.x - p.x) / lb * k, y: p.y + (b.y - p.y) / lb * k };
    d += `${i ? 'L' : 'M'}${f(s.x)} ${f(s.y)}Q${f(p.x)} ${f(p.y)} ${f(e.x)} ${f(e.y)}`;
  }
  return d + (closed ? 'Z' : '');
}

/** Cut-corner plate (BALÍK's chamfer) with trapezoid ports cut into its edges. */
function plate(x0: number, y0: number, x1: number, y1: number, k: number, notches: Notch[], nw: number, nd: number): Pt[] {
  const along = (edge: Notch['edge']) => notches.filter(n => n.edge === edge).map(n => n.at);
  const pts: Pt[] = [{ x: x0 + k, y: y0 }];
  for (const x of along('top').sort((a, b) => a - b)) pts.push({ x: x - nw, y: y0 }, { x: x - nw * .45, y: y0 + nd }, { x: x + nw * .45, y: y0 + nd }, { x: x + nw, y: y0 });
  pts.push({ x: x1 - k, y: y0 }, { x: x1, y: y0 + k });
  for (const y of along('right').sort((a, b) => a - b)) pts.push({ x: x1, y: y - nw }, { x: x1 - nd, y: y - nw * .45 }, { x: x1 - nd, y: y + nw * .45 }, { x: x1, y: y + nw });
  pts.push({ x: x1, y: y1 - k }, { x: x1 - k, y: y1 });
  for (const x of along('bottom').sort((a, b) => b - a)) pts.push({ x: x + nw, y: y1 }, { x: x + nw * .45, y: y1 - nd }, { x: x - nw * .45, y: y1 - nd }, { x: x - nw, y: y1 });
  pts.push({ x: x0 + k, y: y1 }, { x: x0, y: y1 - k });
  for (const y of along('left').sort((a, b) => b - a)) pts.push({ x: x0, y: y + nw }, { x: x0 + nd, y: y + nw * .45 }, { x: x0 + nd, y: y - nw * .45 }, { x: x0, y: y - nw });
  pts.push({ x: x0, y: y0 + k });
  return pts;
}

/** Everything is drawn in real table pixels, so cuts and lines never stretch with the viewport. */
export function consoleGeometry(geo: Geometry, stage: ConsoleStage, cut: 'soft' | 'hard') {
  const { w, h, cardW, cardH, compact } = geo;
  const cx = w / 2, cy = geo.discard.y;
  const margin = compact ? 8 : 20;
  const pad = clamp(cardW * .1, 6, 14);
  const lip = clamp(cardW * .2, 12, 30);
  const radius = cut === 'hard' ? 2 : 7;
  const wellR = cut === 'hard' ? 3 : clamp(cardW * .09, 6, 12);

  // Slots.
  const deck = stage.kind === 'piles' ? box(geo.deck, geo.deckW + pad * 2, geo.deckH + pad * 2, wellR) : null;
  const stageBox = stage.kind === 'piles'
    ? box(geo.discard, geo.pileW + pad * 2.4, geo.pileH + pad * 2.4, wellR)
    : box({ x: cx, y: cy - Math.min(cardH * .03, 4) }, Math.min(w - 2 * (margin + lip), stage.width + pad * 2.4), stage.height + pad * 1.4, wellR);

  // Plate around the slots, with a readout bay for the deck count and the suit indicator.
  let left = (deck?.x ?? stageBox.x) - lip, right = stageBox.x + stageBox.w + lip;
  const badgeBeside = geo.suitBadge.y < cy + geo.pileH / 2;
  if (stage.kind === 'piles' && badgeBeside) right = Math.max(right, geo.suitBadge.x + 72);
  const half = Math.min(w / 2 - margin - 6, Math.max(cx - left, right - cx, cardW * 2.1));
  left = cx - half; right = cx + half;
  const top = Math.min(deck?.y ?? Infinity, stageBox.y) - lip * (compact ? .7 : 1.05);
  let bottom = Math.max(deck ? deck.y + deck.h : 0, stageBox.y + stageBox.h) + lip * (compact ? .7 : .8) + 18;
  if (stage.kind === 'piles' && !badgeBeside) bottom = Math.max(bottom, geo.suitBadge.y + 34);
  bottom = Math.min(bottom, geo.controlY - 6);
  const k = clamp((bottom - top) * (cut === 'hard' ? .2 : .17), 10, cut === 'hard' ? 34 : 28);
  const nw = compact ? 14 : 22, nd = compact ? 4 : 6;

  // Ports and lanes: each opponent seat, plus me at the bottom.
  const notches: Notch[] = [{ edge: 'bottom', at: cx }];
  const lanes: { id: string; d: string; signal: string }[] = [];
  const pads: { id: string; d: string }[] = [];
  const s = geo.oppScale;
  for (const [pid, seat] of Object.entries(geo.seats)) {
    if (seat.side === 'top') {
      const px = clamp(seat.x, left + k + nw + 4, right - k - nw - 4);
      const sy = seat.y + cardH * s * .5 + 4, ey = top + nd;
      const bend = ey - 12 - Math.abs(seat.x - px);
      const path: Pt[] = bend > sy + 8 ? [{ x: seat.x, y: sy }, { x: seat.x, y: bend }, { x: px, y: ey - 12 }, { x: px, y: ey }] : [{ x: seat.x, y: sy }, { x: px, y: ey }];
      if (ey - sy > 10) { notches.push({ edge: 'top', at: px }); lanes.push({ id: pid, d: groove(path, 'x'), signal: rounded(path, 10, false) }); }
      const pw = Math.max(cardW * s * 3.5, compact ? 70 : 104), ph = cardH * s * 1.22;
      pads.push({ id: pid, d: rounded(plate(seat.x - pw / 2, seat.y - ph / 2, seat.x + pw / 2, seat.y + ph / 2, Math.min(10, ph * .2), [], 0, 0), radius) });
    } else {
      const dir = seat.side === 'left' ? 1 : -1;
      const ex = dir > 0 ? left + nd : right - nd, sx = seat.x + dir * cardH * s * .55;
      const py = clamp(seat.y, top + k + nw, bottom - k - nw);
      if ((ex - sx) * dir > 10) {
        notches.push({ edge: seat.side, at: py });
        const path = [{ x: sx, y: seat.y }, { x: ex - dir * (12 + Math.abs(seat.y - py)), y: seat.y }, { x: ex - dir * 12, y: py }, { x: ex, y: py }];
        lanes.push({ id: pid, d: groove(path, 'y'), signal: rounded(path, 10, false) });
      }
      const pw = cardH * s * 1.22, ph = Math.max(cardW * s * 3.5, 104);
      pads.push({ id: pid, d: rounded(plate(seat.x - pw / 2, seat.y - ph / 2, seat.x + pw / 2, seat.y + ph / 2, 10, [], 0, 0), radius) });
    }
  }

  // Front tray: my side of the table, wired to the bottom port.
  const trayTop = Math.max(bottom + 24, geo.handTop + cardH * .14);
  const trayHalf = Math.min(w / 2 - margin, Math.max(geo.handMaxW / 2 + cardW * .35, half + lip));
  const tk = compact ? 16 : 30;
  const tray = rounded([{ x: cx - trayHalf, y: h + 40 }, { x: cx - trayHalf, y: trayTop + tk }, { x: cx - trayHalf + tk, y: trayTop },
    { x: cx - nw, y: trayTop }, { x: cx - nw * .45, y: trayTop + nd }, { x: cx + nw * .45, y: trayTop + nd }, { x: cx + nw, y: trayTop },
    { x: cx + trayHalf - tk, y: trayTop }, { x: cx + trayHalf, y: trayTop + tk }, { x: cx + trayHalf, y: h + 40 }], radius);
  const trayEdge = rounded([{ x: cx - trayHalf, y: trayTop + tk + 12 }, { x: cx - trayHalf, y: trayTop + tk }, { x: cx - trayHalf + tk, y: trayTop }, { x: cx - nw, y: trayTop }], radius, false)
    + rounded([{ x: cx + nw, y: trayTop }, { x: cx + trayHalf - tk, y: trayTop }, { x: cx + trayHalf, y: trayTop + tk }, { x: cx + trayHalf, y: trayTop + tk + 12 }], radius, false);
  const live = Math.min(trayHalf - tk, Math.max(cardW * 2.4, 140));
  const trayLive = `M${f(cx - live)} ${f(trayTop)}H${f(cx - nw)}M${f(cx + nw)} ${f(trayTop)}H${f(cx + live)}`;
  const myLane = [{ x: cx, y: bottom - nd }, { x: cx, y: trayTop + nd }];
  if (trayTop - bottom > 14) lanes.push({ id: 'me', d: groove(myLane, 'x'), signal: rounded(myLane, 0, false) });

  const pts = plate(left, top, right, bottom, k, notches, nw, nd);
  const plateD = rounded(pts, radius);

  // Stage registration brackets: the card is clamped into place.
  const b = clamp(cardW * .16, 8, 20), o = 5;
  const sx0 = stageBox.x - o, sy0 = stageBox.y - o, sx1 = stageBox.x + stageBox.w + o, sy1 = stageBox.y + stageBox.h + o;
  const brackets = `M${f(sx0)} ${f(sy0 + b)}V${f(sy0)}H${f(sx0 + b)}M${f(sx1 - b)} ${f(sy0)}H${f(sx1)}V${f(sy0 + b)}M${f(sx1)} ${f(sy1 - b)}V${f(sy1)}H${f(sx1 - b)}M${f(sx0 + b)} ${f(sy1)}H${f(sx0)}V${f(sy1 - b)}`;

  // Hub: the BALÍK diamond between the slots carries the active suit; trick games have none.
  const gap = deck ? stageBox.x - (deck.x + deck.w) : 0;
  const hub = deck && gap > 18 ? { x: (deck.x + deck.w + stageBox.x) / 2, y: cy, s: clamp(gap * .3, 6, 15) } : null;
  const channel = deck && hub ? { x: deck.x + deck.w - 2, y: cy - hub.s * .32, width: gap + 4, height: hub.s * .64, rx: hub.s * .32 } : null;

  // Deck gauge: eight cells, four cards each.
  const gauge = deck && deck.x - left > 16 ? Array.from({ length: 8 }, (_, i) => {
    const gh = (deck.h - 16) / 8;
    return { x: deck.x - Math.min(11, (deck.x - left) * .45) - 4, y: deck.y + deck.h - 8 - (i + 1) * gh + 1.5, w: 4, h: gh - 3 };
  }) : null;

  const indicatorW = Math.min(stageBox.w * .4, 56);
  const labelY = Math.max(top + 11, Math.min(deck?.y ?? Infinity, stageBox.y) - lip * .32);
  const labels = top + 14 < Math.min(deck?.y ?? Infinity, stageBox.y)
    ? [...(deck ? [{ text: 'BALÍČEK', x: deck.x + deck.w / 2, y: labelY }] : []), { text: stage.kind === 'piles' ? 'ODHOZ' : stage.label, x: stageBox.x + stageBox.w / 2, y: labelY }]
    : [];

  // Frame and mounting rails.
  const fi = compact ? 6 : 12, fk = compact ? 14 : 26;
  const frame = rounded(plate(fi, fi, w - fi, h + 40, fk, [], 0, 0), 4);
  const kl = fk * .5;
  const frameKeys = `M${f(fi + fk * .25)} ${f(fi + fk * .75)}l${f(kl)} ${f(-kl)}M${f(w - fi - fk * .25)} ${f(fi + fk * .75)}l${f(-kl)} ${f(-kl)}`;
  const rails = left - fi > 48 ? `M${f(fi)} ${f(cy)}H${f(left - 10)}M${f(right + 10)} ${f(cy)}H${f(w - fi)}${diamond(fi, cy, 4)}${diamond(w - fi, cy, 4)}` : '';

  return {
    cx, cy, plate: { x0: left, y0: top, x1: right, y1: bottom }, plateD, deck, stage: stageBox, channel, hub, brackets, gauge, labels,
    indicator: { x: stageBox.x + stageBox.w / 2 - indicatorW / 2, y: stageBox.y + stageBox.h + Math.min(lip * .35, 7), w: indicatorW },
    lanes, pads, tray, trayEdge, trayLive, frame, frameKeys, rails,
  };
}

/** Two parallel strokes: a groove that reads as a channel rather than a decorative line. */
function groove(path: Pt[], axis: 'x' | 'y'): string {
  const g = 2.5;
  const shift = (d: number) => rounded(path.map(p => axis === 'x' ? { x: p.x + d, y: p.y } : { x: p.x, y: p.y + d }), 10, false);
  return shift(-g) + shift(g);
}
