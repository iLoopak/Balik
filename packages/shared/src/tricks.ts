/** Trick-taking helpers shared by Šnaps and Mariáš: follow suit, head the trick, trump. */
import type { Card, Rank, Suit } from './cards';

export interface TrickPlay { playerId: string; card: Card }
/** Rank strength from weakest to strongest, per game. */
export type RankOrder = readonly Rank[];

const strength = (order: RankOrder, card: Card) => order.indexOf(card.rank);

/** True when `a` beats `b` given the led suit and an optional trump. */
export function beats(a: Card, b: Card, led: Suit, trump: Suit | null, order: RankOrder): boolean {
  if (a.suit === b.suit) return strength(order, a) > strength(order, b);
  if (trump && a.suit === trump) return true;
  if (trump && b.suit === trump) return false;
  return b.suit !== led && a.suit === led;
}

export function trickWinner(trick: readonly TrickPlay[], trump: Suit | null, order: RankOrder): TrickPlay {
  const led = trick[0]!.card.suit;
  return trick.reduce((best, p) => (beats(p.card, best.card, led, trump, order) ? p : best));
}

/**
 * Cards a player may add to the current trick under strict rules: follow the led suit and
 * beat the best card if possible; without the suit, trump (and over-trump) if possible.
 * With `strict` false (an open talon in Šnaps) any card is legal.
 */
export function legalTrickCards(hand: readonly Card[], trick: readonly TrickPlay[], trump: Suit | null, order: RankOrder, strict = true): Card[] {
  if (!trick.length || !strict) return [...hand];
  const led = trick[0]!.card.suit;
  const best = trickWinner(trick, trump, order).card;
  const follow = hand.filter((c) => c.suit === led);
  if (follow.length) {
    const higher = follow.filter((c) => beats(c, best, led, trump, order));
    return higher.length ? higher : follow;
  }
  const trumps = trump ? hand.filter((c) => c.suit === trump) : [];
  if (trumps.length) {
    const over = trumps.filter((c) => beats(c, best, led, trump, order));
    return over.length ? over : trumps;
  }
  return [...hand];
}
