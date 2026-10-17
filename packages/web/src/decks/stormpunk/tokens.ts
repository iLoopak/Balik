import type { Suit } from '@balik/shared';

export type FactionId = 'vyhen' | 'pohyb' | 'podrost' | 'boure';
export const FACTION_IDS = ['vyhen', 'pohyb', 'podrost', 'boure'] as const;

export const FACTIONS: Record<FactionId, { name: string; color: string; ink: string; motif: string; world: string; suit: Suit }> = {
  vyhen: { name: 'Výheň', color: '#E63946', ink: '#C92B3A', motif: 'plamen', world: 'Energie, která nikdy nespí.', suit: 'hearts' },
  pohyb: { name: 'Pohyb', color: '#F4C430', ink: '#8A6500', motif: 'kruh se dvěma křídly', world: 'Město v jednom rytmu.', suit: 'diamonds' },
  podrost: { name: 'Podrost', color: '#41B06E', ink: '#257448', motif: 'geometrický list', world: 'Život si najde cestu.', suit: 'clubs' },
  boure: { name: 'Bouře', color: '#4AA3FF', ink: '#2469B5', motif: 'mrak s jedním bleskem', world: 'Nebe patří odvážným.', suit: 'spades' },
};

export const SUIT_FACTION: Record<Suit, FactionId> = {
  hearts: 'vyhen', diamonds: 'pohyb', clubs: 'podrost', spades: 'boure',
};
