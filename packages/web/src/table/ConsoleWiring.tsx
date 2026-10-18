import type { GameId } from '@balik/shared';
import { consolePocket } from './environment';
import type { Geometry, Pt } from './layout';

/** Where the dealer console sits, in table pixels (the stage box GameTableTheme draws). */
export interface ConsoleBox { cx: number; cy: number; width: number; height: number }

// CONSOLE_FRAMES live in a 1000×420 box: top edge at y=20, bottom packet notch at y=408,
// straight top edge between x=66 and x=934.
const FRAME = { top: 20 / 420, notch: 408 / 420, inset: 80 / 1000 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const f = (n: number) => Math.round(n * 10) / 10;

/** Polyline with rounded joints, so bends read as machined channels rather than HUD strokes. */
function rounded(input: Pt[], r: number): string {
  const points = input.filter((p, i) => i === 0 || Math.hypot(p.x - input[i - 1]!.x, p.y - input[i - 1]!.y) > .5);
  let d = `M${f(points[0]!.x)} ${f(points[0]!.y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]!, p = points[i]!, b = points[i + 1]!;
    const la = Math.hypot(a.x - p.x, a.y - p.y), lb = Math.hypot(b.x - p.x, b.y - p.y);
    const k = Math.min(r, la / 2, lb / 2);
    d += `L${f(p.x + (a.x - p.x) / la * k)} ${f(p.y + (a.y - p.y) / la * k)}Q${f(p.x)} ${f(p.y)} ${f(p.x + (b.x - p.x) / lb * k)} ${f(p.y + (b.y - p.y) / lb * k)}`;
  }
  const last = points.at(-1)!;
  return `${d}L${f(last.x)} ${f(last.y)}`;
}

/** Two parallel strokes: a groove cut into the table, not a decorative line. */
function groove(path: Pt[], axis: 'x' | 'y') {
  const shift = (g: number) => rounded(path.map(p => (axis === 'x' ? { x: p.x + g, y: p.y } : { x: p.x, y: p.y + g })), 10);
  return shift(-2.5) + shift(2.5);
}

/** Static wiring of the console to every seat, the own tray and the slot instruments. */
export function consoleWiring(geo: Geometry, game: GameId, box: ConsoleBox) {
  const { w, h, cardW, cardH, compact } = geo;
  const top = box.cy - box.height / 2 + box.height * FRAME.top;
  const notch = box.cy - box.height / 2 + box.height * FRAME.notch;
  const x0 = box.cx - box.width / 2 + box.width * FRAME.inset, x1 = box.cx + box.width / 2 - box.width * FRAME.inset;
  const left = box.cx - box.width / 2, right = box.cx + box.width / 2;
  const s = geo.oppScale;

  // Lanes: each opponent seat is wired to a socket on the console rim.
  const lanes: { id: string; groove: string; signal: string; socket: Pt; axis: 'x' | 'y' }[] = [];
  for (const [id, seat] of Object.entries(geo.seats)) {
    if (seat.side === 'top') {
      const px = clamp(seat.x, x0, x1), sy = seat.y + cardH * s * 0.5 + 4;
      if (top - sy < 12) continue;
      const bend = top - 14 - Math.abs(seat.x - px);
      const path = bend > sy + 8 ? [{ x: seat.x, y: sy }, { x: seat.x, y: bend }, { x: px, y: top - 14 }, { x: px, y: top }] : [{ x: seat.x, y: sy }, { x: px, y: top }];
      lanes.push({ id, groove: groove(path, 'x'), signal: rounded(path, 10), socket: { x: px, y: top }, axis: 'x' });
    } else {
      const dir = seat.side === 'left' ? 1 : -1;
      const ex = dir > 0 ? left + 6 : right - 6, sx = seat.x + dir * cardH * s * 0.55;
      if ((ex - sx) * dir < 12) continue;
      const py = clamp(seat.y, box.cy - box.height * 0.3, box.cy + box.height * 0.3);
      const path = [{ x: sx, y: seat.y }, { x: ex - dir * (14 + Math.abs(seat.y - py)), y: seat.y }, { x: ex - dir * 14, y: py }, { x: ex, y: py }];
      lanes.push({ id, groove: groove(path, 'y'), signal: rounded(path, 10), socket: { x: ex, y: py }, axis: 'y' });
    }
  }

  // Front tray: my side of the table, fed through the packet notch.
  const nw = compact ? 14 : 22, nd = compact ? 4 : 6, tk = compact ? 16 : 30;
  const trayTop = Math.max(notch + 26, geo.handTop + cardH * 0.14);
  const trayHalf = Math.min(w / 2 - (compact ? 8 : 20), Math.max(geo.handMaxW / 2 + cardW * 0.35, box.width / 2));
  const cx = box.cx;
  const tray = `M${f(cx - trayHalf)} ${f(h + 40)}V${f(trayTop + tk)}L${f(cx - trayHalf + tk)} ${f(trayTop)}H${f(cx - nw)}L${f(cx - nw * 0.45)} ${f(trayTop + nd)}H${f(cx + nw * 0.45)}L${f(cx + nw)} ${f(trayTop)}H${f(cx + trayHalf - tk)}L${f(cx + trayHalf)} ${f(trayTop + tk)}V${f(h + 40)}Z`;
  const live = Math.min(trayHalf - tk, Math.max(cardW * 2.4, 140));
  const trayLive = `M${f(cx - live)} ${f(trayTop)}H${f(cx - nw)}M${f(cx + nw)} ${f(trayTop)}H${f(cx + live)}`;
  const me = trayTop - notch > 14 ? [{ x: cx, y: notch }, { x: cx, y: trayTop + nd }] : null;
  if (me) lanes.push({ id: 'me', groove: groove(me, 'x'), signal: rounded(me, 0), socket: me[0]!, axis: 'x' });

  // Instruments: a stock gauge beside the draw slot, registration corners on the stage.
  const draw = game === 'lhar' ? null : consolePocket(geo, game, 'draw');
  const gauge = draw && draw.x - draw.width / 2 - left > 18
    ? Array.from({ length: 8 }, (_, i) => {
      const gh = (draw.height - 16) / 8;
      return { x: draw.x - draw.width / 2 - 9, y: draw.y + draw.height / 2 - 8 - (i + 1) * gh + 1.5, w: 4, h: gh - 3 };
    })
    : null;
  const play = consolePocket(geo, game, 'play');
  const b = clamp(cardW * 0.16, 8, 20), o = 4;
  const sx0 = play.x - play.width / 2 - o, sy0 = play.y - play.height / 2 - o, sx1 = play.x + play.width / 2 + o, sy1 = play.y + play.height / 2 + o;
  const brackets = `M${f(sx0)} ${f(sy0 + b)}V${f(sy0)}H${f(sx0 + b)}M${f(sx1 - b)} ${f(sy0)}H${f(sx1)}V${f(sy0 + b)}M${f(sx1)} ${f(sy1 - b)}V${f(sy1)}H${f(sx1 - b)}M${f(sx0 + b)} ${f(sy1)}H${f(sx0)}V${f(sy1 - b)}`;

  return { lanes, tray, trayLive, gauge, brackets };
}

export type ConsoleWiringShape = ReturnType<typeof consoleWiring>;

/** Below the console: tray and lanes run underneath the apparatus. */
export function ConsoleWiringUnder({ geo, wiring, active, myTurn }: { geo: Geometry; wiring: ConsoleWiringShape; active: string | null; myTurn: boolean }) {
  return <svg className="console-wiring console-wiring-under" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`}>
    <path className="console-tray" d={wiring.tray} />
    <path className="console-tray-live" d={wiring.trayLive} />
    {wiring.lanes.map(l => <g key={l.id} className={`console-lane${l.id === active || (l.id === 'me' && myTurn) ? ' is-live' : ''}`} data-console-lane={l.id}>
      <path className="console-lane-groove" d={l.groove} />
      <path className="console-lane-signal" d={l.signal} />
      <rect className="console-lane-socket" x={l.socket.x - (l.axis === 'x' ? 7 : 2)} y={l.socket.y - (l.axis === 'x' ? 2 : 7)} width={l.axis === 'x' ? 14 : 4} height={l.axis === 'x' ? 4 : 14} rx={1} />
    </g>)}
  </svg>;
}

/** Above the console: instruments that belong to the slots. */
export function ConsoleWiringOver({ geo, wiring, drawCount }: { geo: Geometry; wiring: ConsoleWiringShape; drawCount?: number }) {
  const lit = drawCount === undefined ? 0 : Math.ceil(Math.min(32, drawCount) / 4);
  return <svg className="console-wiring console-wiring-over" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`}>
    {wiring.gauge && drawCount !== undefined && <g className="console-gauge" data-console-gauge={lit}>
      {wiring.gauge.map((g, i) => <rect key={i} className={i < lit ? 'is-on' : ''} x={g.x} y={g.y} width={g.w} height={g.h} rx={1} />)}
    </g>}
    <path className="console-brackets" d={wiring.brackets} />
  </svg>;
}
