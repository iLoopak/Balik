// Classic 32-card French deck used by Prší. Pure data — visual skins live in the web package.

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  /** Stable unique id within a deck, e.g. "hearts-7". */
  id: string;
  suit: Suit;
  rank: Rank;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_NAME_CS: Record<Suit, string> = {
  hearts: 'srdce',
  diamonds: 'káry',
  clubs: 'kříže',
  spades: 'piky',
};

export function cardId(suit: Suit, rank: Rank): string {
  return `${suit}-${rank}`;
}

export function createDeck32(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ id: cardId(suit, rank), suit, rank });
  }
  return deck;
}

export function isSuit(value: unknown): value is Suit {
  return typeof value === 'string' && (SUITS as readonly string[]).includes(value);
}

export function cardLabel(card: Card): string {
  return `${card.rank} ${SUIT_SYMBOL[card.suit]}`;
}

export type Rng = () => number;

/** Small deterministic PRNG for tests and reproducible rounds. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
