import type { CardEntity, Display, Spawn } from './display';

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
}

export interface Placement {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  faceUp: boolean;
  z: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Opponents in turn order after me, laid out left → right. */
export function opponentsOf(order: string[], me: string): string[] {
  const i = order.indexOf(me);
  if (i < 0) return order.slice();
  return [...order.slice(i + 1), ...order.slice(0, i)];
}

export function computeGeometry(w: number, h: number, order: string[], me: string, myHandCount: number): Geometry {
  const compact = w < 700;
  const cardW = compact ? clamp(Math.min(w * 0.235, h * 0.13), 58, 104) : clamp(Math.min(w * 0.085, h * 0.13), 78, 124);
  const cardH = cardW * 1.4;
  const oppScale = compact ? 0.44 : 0.52;
  const handMaxW = Math.min(w - 24, compact ? w : 820);

  const twoRows = needsTwoRows(myHandCount, cardW, handMaxW, compact);
  const handY = h - cardH * 0.57 - (compact ? 12 : 24);
  const handTop = handY - cardH / 2 - (twoRows ? cardH * 0.42 : 0) - cardH * 0.08;

  const seatsY = compact ? cardH * 0.44 * 0.5 + 22 : cardH * 0.55 + 18;
  const hudSpace = 96;
  const centerY = clamp((seatsY + 70 + handTop - hudSpace) / 2, seatsY + cardH * 0.9, handTop - hudSpace - cardH * 0.5);
  const pileGap = cardW * 0.72;

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
    deck: { x: w / 2 - pileGap, y: centerY },
    discard: { x: w / 2 + pileGap, y: centerY },
    handY,
    handMaxW,
    handTop,
    seats,
    hudY: centerY + cardH / 2 + 30,
    labelY: Math.min(centerY + cardH / 2 + 70, handTop - 90),
  };
}

function needsTwoRows(n: number, cardW: number, maxW: number, compact: boolean): boolean {
  if (!compact || n <= 6) return false;
  const spacing = (maxW - cardW) / (n - 1);
  return spacing < cardW * 0.4;
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
  const twoRows = needsTwoRows(n, geo.cardW, geo.handMaxW, geo.compact);
  const rows: CardEntity[][] = twoRows ? [hand.slice(0, Math.ceil(n / 2)), hand.slice(Math.ceil(n / 2))] : [hand];
  rows.forEach((row, r) => {
    const m = row.length;
    const isBack = twoRows && r === 0;
    const baseY = isBack ? geo.handY - geo.cardH * 0.42 : geo.handY;
    const spacing = m > 1 ? Math.min(geo.cardW * (geo.compact ? 0.66 : 0.6), (geo.handMaxW - geo.cardW) / (m - 1)) : 0;
    const maxAngle = Math.min(geo.compact ? 9 : 12, m * 2.2);
    row.forEach((e, i) => {
      const f = fan(m, i, spacing, maxAngle);
      let y = baseY + f.arc * geo.cardH * 0.07;
      let rotate = f.rotate;
      let scale = 1;
      let z = (isBack ? 200 : 260) + i;
      const lifted = ui.hovered === e.key || ui.selected === e.key || ui.pendingKey === e.key;
      if (lifted) {
        y -= geo.cardH * (ui.selected === e.key || ui.pendingKey === e.key ? 0.26 : 0.18);
        rotate *= 0.35;
        scale = 1.06;
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
    scale: 1,
    faceUp: true,
    z: top ? 300 : 100 + index,
  };
}

export function placeDeck(geo: Geometry): Placement {
  return { x: geo.deck.x, y: geo.deck.y, rotate: 0, scale: 1, faceUp: false, z: 60 };
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
