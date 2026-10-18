import type { Card } from '@balik/shared';
import { sortHand, type CardEntity } from '../table/display';

let hidden = 0;
/** A card on the table. Known cards keep their id as key, so they move instead of remounting. */
export function entity(card: Card | null, stamp: number, extra: Partial<CardEntity> = {}, prefix = 'hidden'): CardEntity {
  return { key: card?.id ?? `${prefix}-${++hidden}`, card, move: null, moveStamp: stamp, spawn: null, delay: 0, flash: null, ...extra };
}

/** Index of every known card entity, so reconciliation reuses identities. */
export function knownEntities(...groups: (CardEntity[] | undefined)[]): Map<string, CardEntity> {
  return new Map(groups.flatMap((g) => g ?? []).filter((e) => e.card).map((e) => [e.card!.id, e]));
}

/** My hand from the snapshot (sorted, identities reused) and face-down placeholders for others. */
export function reconcileHands(players: { id: string; handCount: number }[], me: string, myHand: Card[] | null, prev: Record<string, CardEntity[]> | undefined, known: Map<string, CardEntity>, stamp: number, prefix: string): Record<string, CardEntity[]> {
  return Object.fromEntries(players.map((p) => {
    if (p.id === me) return [p.id, sortHand((myHand ?? []).map((c) => known.get(c.id) ?? entity(c, stamp)))];
    const kept = (prev?.[p.id] ?? []).filter((e) => !e.card).slice(0, p.handCount);
    while (kept.length < p.handCount) kept.push(entity(null, stamp, {}, prefix));
    return [p.id, kept];
  }));
}

/** Take a card out of a hand: by id for me, the last placeholder for an opponent. */
export function takeFromHand(hand: CardEntity[], card: Card | null, mine: boolean): { rest: CardEntity[]; taken: CardEntity | undefined } {
  const rest = [...hand];
  const index = mine && card ? rest.findIndex((e) => e.card?.id === card.id) : Math.max(0, rest.length - 1);
  const taken = index >= 0 ? rest.splice(index, 1)[0] : undefined;
  return { rest, taken };
}
