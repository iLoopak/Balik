import type { Card, Rank, Suit } from '@balik/shared';

// Visual skin, kept separate from game data. Game logic only knows suit/rank;
// everything here (colours, glyphs, future faction art) can be swapped per skin.

export type GameId = 'prsi';

export interface StickerAsset {
  /** Transparent image (PNG/WebP/SVG) rendered in its own layer above the card face. */
  src: string;
  /** Relative to card width (1 = full width). */
  scale?: number;
  /** Offset in % of card width/height from the centre. */
  offset?: [number, number];
  rotation?: number;
}

export type FactionId = 'vyhen' | 'pohyb' | 'podrost' | 'boure';

/** Future BALÍK identity. Not applied to the classic Prší deck yet. */
export const FACTIONS: Record<FactionId, { name: string; color: string; motif: string }> = {
  vyhen: { name: 'Výheň', color: '#e4572e', motif: 'plamen' },
  pohyb: { name: 'Pohyb', color: '#f2c12e', motif: 'kruh s pohybovými liniemi' },
  podrost: { name: 'Podrost', color: '#3fa34d', motif: 'list' },
  boure: { name: 'Bouře', color: '#3b82f6', motif: 'oblak s bleskem' },
};

/** Tentative suit → faction mapping for the future stormpunk skin. */
export const SUIT_FACTION: Record<Suit, FactionId> = {
  hearts: 'vyhen',
  diamonds: 'pohyb',
  clubs: 'podrost',
  spades: 'boure',
};

type StickerKey = `${GameId}:${Suit}:${Rank}` | `${GameId}:${Suit}:*` | `${GameId}:*:${Rank}`;

/**
 * game + suit + rank → sticker. Most specific key wins.
 * Empty for now; drop entries here once sticker assets exist, e.g.
 *   'prsi:hearts:Q': { src: '/stickers/vyhen-q.webp', scale: 0.8, offset: [0, 4] }
 */
const STICKERS: Partial<Record<StickerKey, StickerAsset>> = {};

export function stickerFor(game: GameId, card: Card): StickerAsset | null {
  return (
    STICKERS[`${game}:${card.suit}:${card.rank}`] ??
    STICKERS[`${game}:${card.suit}:*`] ??
    STICKERS[`${game}:*:${card.rank}`] ??
    null
  );
}

/** `?stickers=demo` shows placeholder sticker slots to check the layer's placement. */
export const STICKER_DEMO = new URLSearchParams(window.location.search).get('stickers') === 'demo';

export const SUIT_COLOR: Record<Suit, string> = {
  hearts: 'var(--suit-red)',
  diamonds: 'var(--suit-red)',
  clubs: 'var(--suit-black)',
  spades: 'var(--suit-black)',
};

/** Brighter suit tones for use on the dark table (indicators, splashes). */
export const SUIT_TONE: Record<Suit, string> = {
  hearts: '#ff5468',
  diamonds: '#ff7a59',
  clubs: '#e9e4d8',
  spades: '#c9d2e6',
};

/** Short rules hint printed on special cards. */
export const RANK_HINT: Partial<Record<Rank, string>> = {
  '7': '+2',
  A: 'stop',
  Q: 'barva',
};
