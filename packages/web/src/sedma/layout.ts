import type { Geometry, PlacedCard } from '../table/layout';
import { placeMyHand, placeOpponent, type HandUi } from '../table/layout';
import type { SedmaDisplay } from './display';

/** Reuses the hand fan and seats; the centre has one readable column per trick participant. */
export function placeSedma(d: SedmaDisplay, geo: Geometry, me: string, ui: HandUi): PlacedCard[] {
  const placed: PlacedCard[] = [];
  const hand = d.hands[me] ?? [];
  const mine = placeMyHand(geo, hand, false, ui);
  for (const entity of hand) placed.push({ entity, place: mine.get(entity.key)!, zone: 'mine' });
  for (const p of d.view.players) if (p.id !== me) (d.hands[p.id] ?? []).forEach((entity, i, cards) => placed.push({ entity, place: placeOpponent(geo, p.id, cards.length, i), zone: 'opp' }));
  const scale = geo.compact ? .82 : 1;
  const n = d.view.players.length;
  const step = Math.min(geo.cardW * (geo.compact ? .88 : 1.12), (geo.w - geo.cardW * scale - 20) / Math.max(1, n - 1));
  const start = d.trick[0]?.playerId ?? d.view.leaderId;
  const index = d.view.players.findIndex((p) => p.id === start);
  d.trick.forEach(({ entity, playerId }, i) => {
    const seat = (d.view.players.findIndex((p) => p.id === playerId) - index + n) % n;
    const circuit = Math.floor(i / n);
    const latest = !d.trick.slice(i + 1).some((p) => p.playerId === playerId);
    placed.push({ entity, zone: 'discard', place: { x: geo.w / 2 + (seat - (n - 1) / 2) * step, y: geo.discard.y - circuit * Math.min(geo.cardH * .1, 12), scale, rotate: (seat - (n - 1) / 2) * 3, faceUp: true, z: 200 + i } });
    // Older circuits remain a visible physical stack, latest card stays above them.
    if (!latest) placed.at(-1)!.place.scale *= .98;
  });
  const capture = d.captureTo === me ? { x: geo.w / 2, y: geo.controlY } : geo.seats[d.captureTo ?? ''];
  d.outgoing.forEach((entity, i) => placed.push({ entity, zone: 'outgoing', place: { x: capture?.x ?? geo.w / 2, y: capture?.y ?? 40, rotate: i * 2, scale: .25, faceUp: false, z: 450 + i } }));
  return placed;
}
