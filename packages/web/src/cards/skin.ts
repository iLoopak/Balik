import { SUIT_NAME_CS, type Card, type Rank, type Suit } from '@balik/shared';
import { stormpunkFor } from '../decks/stormpunk/manifest';
import { FACTIONS, SUIT_FACTION } from '../decks/stormpunk/tokens';
export { FACTIONS, SUIT_FACTION } from '../decks/stormpunk/tokens';
export type { FactionId } from '../decks/stormpunk/tokens';

// A visual choice only: no game state, rules or protocol depends on this module.
export type GameId = 'prsi';
export type DeckId = 'classic' | 'stormpunk';
export const ACTIVE_DECK: DeckId = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('deck') === 'classic' ? 'classic' : 'stormpunk';

export interface StickerAsset {
  src: string;
  scale?: number;
  offset?: [number, number];
  rotation?: number;
}

export function stickerFor(_game: GameId, card: Card, deck: DeckId = ACTIVE_DECK): StickerAsset | null {
  if (deck === 'classic') return null;
  const art = stormpunkFor(card);
  return { src: art.stickerAsset, scale: art.scale, offset: art.offset };
}

export const STICKER_DEMO = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('stickers') === 'demo';

export function suitName(suit: Suit, deck: DeckId = ACTIVE_DECK): string {
  return deck === 'stormpunk' ? FACTIONS[SUIT_FACTION[suit]].name : SUIT_NAME_CS[suit];
}

export function suitColor(suit: Suit, deck: DeckId = ACTIVE_DECK): string {
  return deck === 'stormpunk' ? FACTIONS[SUIT_FACTION[suit]].ink : SUIT_COLOR[suit];
}

export const SUIT_COLOR: Record<Suit, string> = {
  hearts: 'var(--suit-red)', diamonds: 'var(--suit-red)', clubs: 'var(--suit-black)', spades: 'var(--suit-black)',
};

export const SUIT_TONE: Record<Suit, string> = ACTIVE_DECK === 'stormpunk'
  ? { hearts: FACTIONS.vyhen.color, diamonds: FACTIONS.pohyb.color, clubs: FACTIONS.podrost.color, spades: FACTIONS.boure.color }
  : { hearts: '#ff5468', diamonds: '#ff7a59', clubs: '#e9e4d8', spades: '#c9d2e6' };

export const RANK_HINT: Partial<Record<Rank, string>> = { '7': '+2', A: 'stop', Q: 'barva' };
