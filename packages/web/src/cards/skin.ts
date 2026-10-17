import { type Card, type Rank, type Suit } from '@balik/shared';
import { DECK_THEMES } from '../themes/registry';
import { useAppearance } from '../themes/preferences';
import type { DeckId } from '../themes/types';
export type { GameId } from '@balik/shared';
export type { DeckId, StickerAsset } from '../themes/types';
export { FACTIONS, SUIT_FACTION } from '../decks/stormpunk/tokens';
export type { FactionId } from '../decks/stormpunk/tokens';
import type { GameId } from '@balik/shared';
export function stickerFor(_game: GameId, card: Card, deck: DeckId = useAppearance.getState().deck) {
  return DECK_THEMES[deck].stickerFor(card);
}
export function suitName(suit: Suit, deck: DeckId = useAppearance.getState().deck) { return DECK_THEMES[deck].suits[suit].name; }
export function suitColor(suit: Suit, deck: DeckId = useAppearance.getState().deck) { return DECK_THEMES[deck].suits[suit].ink; }
export function suitTone(suit: Suit, deck: DeckId = useAppearance.getState().deck) { return DECK_THEMES[deck].suits[suit].color; }
export const RANK_HINT: Partial<Record<Rank, string>> = { '7': '+2', A: 'stop', Q: 'barva' };
