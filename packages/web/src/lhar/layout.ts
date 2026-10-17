import type { Geometry, HandUi, PlacedCard } from '../table/layout';
import { placeMyHand, placeOpponent } from '../table/layout';
import type { LharDisplay } from './display';
export function placeLhar(
  d: LharDisplay,
  geo: Geometry,
  me: string,
  ui: HandUi,
  selected: ReadonlySet<string>,
): PlacedCard[] {
  const placed: PlacedCard[] = [],
    hand = d.hands[me] ?? [],
    mine = placeMyHand(geo, hand, false, ui);
  for (const e of hand) {
    const at = mine.get(e.key)!;
    placed.push({
      entity: e,
      zone: 'mine',
      place: selected.has(e.card?.id ?? '')
        ? { ...at, y: at.y - geo.cardH * 0.12, rotate: 0, z: at.z + 350 }
        : at,
    });
  }
  for (const p of d.view.players)
    if (p.id !== me)
      (d.hands[p.id] ?? []).forEach((e, i, cards) => {
        // Large hidden hands use bounded spacing per seat, independent of their identities.
        const at = placeOpponent(geo, p.id, cards.length, i),
          seat = geo.seats[p.id];
        const max = geo.w / (d.view.players.length + 1),
          span = geo.cardW * geo.oppScale * 0.18 * Math.max(0, cards.length - 1);
        if (seat && span > max) {
          if (seat.side === 'top') at.x = seat.x + ((at.x - seat.x) * max) / span;
          else at.y = seat.y + ((at.y - seat.y) * max) / span;
        }
        placed.push({ entity: e, zone: 'opp', place: at });
      });
  const revealed = d.beat === 'reveal';
  const last = d.view.lastClaim;
  d.pile.forEach((p, i) => {
    const isRevealed = revealed && p.claimId === d.resolution?.claim.id;
    const local = isRevealed
      ? d.pile.filter((q) => q.claimId === p.claimId).findIndex((q) => q.entity.key === p.entity.key)
      : 0;
    const count = isRevealed ? d.resolution!.revealed.length : 1;
    const step = Math.min(geo.cardW * 0.8, (geo.w - geo.cardW - 24) / Math.max(1, count - 1));
    const top = !!last && p.claimId === last.id;
    placed.push({
      entity: p.entity,
      zone: 'discard',
      place: {
        x: geo.w / 2 + (isRevealed ? (local - (count - 1) / 2) * step : ((i % 4) - 1.5) * 2),
        y: geo.discard.y - (top ? 9 : 0) - (i % 5) * 1.5,
        rotate: isRevealed ? 0 : ((i % 5) - 2) * 3,
        scale: geo.compact ? 0.82 : 1,
        faceUp: isRevealed,
        z: 100 + i + (isRevealed ? 400 : top ? 200 : 0),
      },
    });
  });
  return placed;
}
