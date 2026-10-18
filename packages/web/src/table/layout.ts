import type { CardEntity, Display, Spawn } from './display';
import { responsiveCardScale, TABLE_METRICS } from './responsiveCardScale';

// Every card on the table lives in one absolutely positioned layer. This module turns the
// display state + table size into target transforms; Motion animates between targets, so
// moving a card between zones is just a change of target, never a remount.

export interface Pt {
  x: number;
  y: number;
}

export interface SeatGeo extends Pt {
  side: 'top' | 'left' | 'right';
}

export interface Geometry {
  w: number;
  h: number;
  compact: boolean;
  cardW: number;
  cardH: number;
  oppScale: number;
  short: boolean;
  handRows: 1 | 2;
  /** Vertical distance between the two hand rows, in card heights. */
  rowOffset: number;
  discardScale: number;
  deckScale: number;
  pileW: number;
  pileH: number;
  deckW: number;
  deckH: number;
  controlY: number;
  controlHeight: number;
  suitBadge: Pt;
  deck: Pt;
  discard: Pt;
  /** Centre line of the own hand's front row. */
  handY: number;
  handMaxW: number;
  /** Top edge of the own hand (for placing the status bar above it). */
  handTop: number;
  seats: Record<string, SeatGeo>;
  hudY: number;
  /** Centre of the action label, below the suit chip and above the status bar. */
  labelY: number;
  /** Optional size of a wide central play area (Durak pairs, Oko hands); the console pocket follows it. */
  stage?: { width: number; height: number };
}

export interface Placement {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  faceUp: boolean;
  z: number;
}

/** Opponents in turn order after me, laid out left → right. */
export function opponentsOf(order: string[], me: string): string[] {
  const i = order.indexOf(me);
  if (i < 0) return order.slice();
  return [...order.slice(i + 1), ...order.slice(0, i)];
}

export function computeGeometry(w: number, h: number, order: string[], me: string, myHandCount: number): Geometry {
  const metrics = responsiveCardScale(w, h, myHandCount);
  const { compact, cardW, cardH, oppScale, handMaxW, rows, rowOffset, discardScale, deckScale } = metrics;
  const handY = h - metrics.edge - cardH * TABLE_METRICS.handBottom;
  // Includes a fully lifted card: the control bar never sits underneath the hand.
  const handTop = handY - cardH * (TABLE_METRICS.handHeadroom + (rows - 1) * rowOffset);
  const controlY = handTop - metrics.controlHeight - metrics.controlGap;
  const seatsY = metrics.topInset + cardH * oppScale * .5;
  const opponentsBottom = metrics.topInset + cardH * oppScale + metrics.seatGap + metrics.seatHeight;
  const pileHalf = cardH * metrics.pileEnvelope * .5;
  const upperCenter = opponentsBottom + metrics.zoneGap + pileHalf;
  const lowerCenter = controlY - metrics.hudClearance - pileHalf;
  const centerY = (upperCenter + Math.max(upperCenter, lowerCenter)) / 2;
  const pileGap = cardW * (compact ? .75 : .86);
  const pileW = cardW * discardScale;
  const pileH = cardH * discardScale;
  const deckW = cardW * deckScale;
  const deckH = cardH * deckScale;

  const opps = opponentsOf(order, me);
  const seats: Record<string, SeatGeo> = {};
  const n = opps.length;
  if (n === 3 && !compact && w >= 900) {
    seats[opps[0]!] = { x: w * 0.1, y: centerY - cardH * 0.25, side: 'left' };
    seats[opps[1]!] = { x: w / 2, y: seatsY, side: 'top' };
    seats[opps[2]!] = { x: w * 0.9, y: centerY - cardH * 0.25, side: 'right' };
  } else {
    const spread = n === 1 ? [0.5] : n === 2 ? [0.27, 0.73] : [0.17, 0.5, 0.83];
    opps.forEach((id, i) => (seats[id] = { x: w * spread[i]!, y: seatsY, side: 'top' }));
  }

  return {
    w,
    h,
    compact,
    cardW,
    cardH,
    oppScale,
    short: metrics.short,
    handRows: rows,
    rowOffset,
    discardScale, deckScale, pileW, pileH, deckW, deckH,
    controlY, controlHeight: metrics.controlHeight,
    suitBadge: metrics.badgeBeside
      ? { x: w / 2 + pileGap + pileW / 2 + 64, y: centerY + pileH * .08 }
      : { x: w / 2 + pileGap, y: centerY + pileH / 2 + 10 },
    deck: { x: w / 2 - pileGap, y: centerY },
    discard: { x: w / 2 + pileGap, y: centerY },
    handY,
    handMaxW,
    handTop,
    seats,
    hudY: centerY + pileH / 2 + 24,
    labelY: controlY - 22,
  };
}

/** Deterministic small jitter per card so the discard pile looks hand-placed. */
function jitter(key: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 500 - 1;
}

function fan(count: number, index: number, spacing: number, maxAngle: number) {
  const mid = (count - 1) / 2;
  const offset = index - mid;
  const norm = mid > 0 ? offset / mid : 0;
  return { dx: offset * spacing, rotate: count > 1 ? norm * maxAngle : 0, arc: norm * norm };
}

export interface HandUi {
  hovered: string | null;
  selected: string | null;
  pendingKey: string | null;
  playable: Set<string>;
  myTurn: boolean;
}

export function placeMyHand(geo: Geometry, hand: CardEntity[], collapsed: boolean, ui: HandUi): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const n = hand.length;
  const cx = geo.w / 2;
  if (collapsed) {
    hand.forEach((e, i) => out.set(e.key, { x: cx + i * 1.2, y: geo.handY - i * 0.8, rotate: (i % 2 ? 1 : -1) * 1.5, scale: 1, faceUp: false, z: 200 + i }));
    return out;
  }
  const twoRows = geo.handRows === 2;
  const rows: CardEntity[][] = twoRows ? [hand.slice(0, Math.ceil(n / 2)), hand.slice(Math.ceil(n / 2))] : [hand];
  rows.forEach((row, r) => {
    const m = row.length;
    const isBack = twoRows && r === 0;
    const baseY = isBack ? geo.handY - geo.cardH * geo.rowOffset : geo.handY;
    const spacing = m > 1 ? Math.min(geo.cardW * (geo.compact ? 0.66 : 0.68), (geo.handMaxW - geo.cardW) / (m - 1)) : 0;
    const maxAngle = Math.min(geo.compact ? 9 : 10, m * 1.8);
    row.forEach((e, i) => {
      const f = fan(m, i, spacing, maxAngle);
      let y = baseY + f.arc * geo.cardH * 0.045;
      let rotate = f.rotate;
      let scale = 1;
      let z = (isBack ? 200 : 260) + i;
      const lifted = ui.hovered === e.key || ui.selected === e.key || ui.pendingKey === e.key;
      if (lifted) {
        y -= geo.cardH * (ui.selected === e.key || ui.pendingKey === e.key ? TABLE_METRICS.selectedLift : TABLE_METRICS.hoverLift);
        rotate *= ui.selected === e.key ? .15 : .3;
        scale = TABLE_METRICS.emphasisScale;
        z += 300;
      } else if (ui.myTurn && ui.playable.has(e.key)) {
        y -= geo.cardH * 0.06;
      }
      out.set(e.key, { x: geo.w / 2 + f.dx, y, rotate, scale, faceUp: true, z });
    });
  });
  return out;
}

export function placeOpponent(geo: Geometry, playerId: string, count: number, index: number): Placement {
  const seat = geo.seats[playerId] ?? { x: geo.w / 2, y: -geo.cardH, side: 'top' as const };
  const s = geo.oppScale;
  const spacing = geo.cardW * s * (count > 8 ? 0.18 : 0.3);
  const f = fan(count, index, spacing, Math.min(16, count * 3));
  if (seat.side === 'top') {
    return { x: seat.x + f.dx, y: seat.y + f.arc * geo.cardH * s * 0.08, rotate: 180 - f.rotate, scale: s, faceUp: false, z: 150 + index };
  }
  const dir = seat.side === 'left' ? 1 : -1;
  return {
    x: seat.x + f.arc * geo.cardH * s * 0.08 * -dir,
    y: seat.y + f.dx,
    rotate: 90 * dir + f.rotate * dir,
    scale: s,
    faceUp: false,
    z: 150 + index,
  };
}

export function placeDiscard(geo: Geometry, key: string, index: number, count: number): Placement {
  const top = index === count - 1;
  return {
    x: geo.discard.x + jitter(key, 1) * geo.cardW * 0.05,
    y: geo.discard.y + jitter(key, 2) * geo.cardW * 0.05,
    rotate: jitter(key, 3) * 11,
    scale: geo.discardScale,
    faceUp: true,
    z: top ? 300 : 100 + index,
  };
}

export function placeDeck(geo: Geometry): Placement {
  return { x: geo.deck.x, y: geo.deck.y, rotate: 0, scale: geo.deckScale, faceUp: false, z: 60 };
}

export function placeSpawn(geo: Geometry, spawn: Spawn): Placement | null {
  switch (spawn.kind) {
    case 'deck':
      return { ...placeDeck(geo), z: 0 };
    case 'seat':
      return placeOpponent(geo, spawn.playerId, spawn.count, spawn.index);
    case 'fade':
      return null;
  }
}

export interface PlacedCard {
  entity: CardEntity;
  place: Placement;
  zone: 'mine' | 'opp' | 'discard' | 'outgoing';
}

export function placeAll(d: Display, geo: Geometry, ui: HandUi): PlacedCard[] {
  const out: PlacedCard[] = [];
  const seen = new Set<string>();
  const push = (entity: CardEntity, place: Placement, zone: PlacedCard['zone']) => {
    if (seen.has(entity.key)) return;
    seen.add(entity.key);
    out.push({ entity, place, zone });
  };

  // Highest priority first, so duplicates resolve to where the card is now.
  d.discard.forEach((e, i) => push(e, placeDiscard(geo, e.key, i, d.discard.length), 'discard'));
  const mine = d.hands[d.me] ?? [];
  const minePlaced = placeMyHand(geo, mine, d.handCollapsed, ui);
  for (const e of mine) push(e, minePlaced.get(e.key)!, 'mine');
  for (const id of d.order) {
    if (id === d.me) continue;
    const hand = d.hands[id] ?? [];
    hand.forEach((e, i) => push(e, placeOpponent(geo, id, hand.length, i), 'opp'));
  }
  d.outgoing.forEach((e) => push(e, placeDeck(geo), 'outgoing'));
  return out;
}
