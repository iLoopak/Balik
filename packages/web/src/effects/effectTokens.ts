import { DECK_THEMES, type DeckId } from '../themes/registry';
import { useColorMode, type ColorMode } from '../themes/colorMode';
import { lightEffectInk } from '../themes/colorContrast';
import { useAppearance } from '../themes/preferences';
import type { Suit } from '@balik/shared';
import { FACTIONS, SUIT_FACTION, type FactionId } from '../decks/stormpunk/tokens';

export const EFFECT_TIMING = {
  flight: .46, drawFlight: .44, impact: .38, sticker: .38,
  skip: .66, reverse: .64, penalty: .72, suit: .8, win: .9,
} as const;

export const EFFECT_BUDGET = { desktop: 8, mobile: 5, lite: 2, concurrent: 10 } as const;
export type EffectQuality = 'full' | 'mobile' | 'lite' | 'reduced';

export const FACTION_EFFECTS: Record<FactionId, { color: string; secondary: string; shape: 'spark' | 'dash' | 'leaf' | 'bolt'; rotation: number }> = {
  vyhen: { color: FACTIONS.vyhen.color, secondary: '#FFAA4C', shape: 'spark', rotation: 12 },
  pohyb: { color: FACTIONS.pohyb.color, secondary: '#FFF0AC', shape: 'dash', rotation: -12 },
  podrost: { color: FACTIONS.podrost.color, secondary: '#B0E8A1', shape: 'leaf', rotation: 30 },
  boure: { color: FACTIONS.boure.color, secondary: '#C7EBFF', shape: 'bolt', rotation: -22 },
};

export function effectTheme(suit: Suit = 'spades', deck: DeckId = useAppearance.getState().deck, mode: ColorMode = useColorMode.getState().mode) {
  const base = FACTION_EFFECTS[SUIT_FACTION[suit]];
  const theme = { ...base, ...DECK_THEMES[deck].fx, color: DECK_THEMES[deck].suits[suit].color };
  return mode === 'light' ? { ...theme, color: lightEffectInk(theme.color), secondary: lightEffectInk(theme.secondary) } : theme;
}

export function effectQuality(reduced: boolean, lite: boolean, compact: boolean): EffectQuality {
  return reduced ? 'reduced' : lite ? 'lite' : compact ? 'mobile' : 'full';
}

export function particleBudget(quality: EffectQuality) {
  return quality === 'reduced' ? 0 : quality === 'lite' ? EFFECT_BUDGET.lite : quality === 'mobile' ? EFFECT_BUDGET.mobile : EFFECT_BUDGET.desktop;
}
