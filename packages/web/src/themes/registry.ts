import { SUITS, SUIT_NAME_CS, type Suit } from '@balik/shared';
import { stormpunkFor } from '../decks/stormpunk/manifest';
import { FACTIONS, SUIT_FACTION } from '../decks/stormpunk/tokens';
import { FACTION_PATHS } from '../decks/stormpunk/FactionIcon';
import { CLASSIC_PATHS } from './decks/classic';
import { RETRO_ARCADE_CARDS } from './decks/retro-arcade/manifest';
import type { DeckId, DeckTheme, TableId, TableTheme, SuitStyle } from './types';
export type { DeckId, DeckTheme, TableId, TableTheme, StickerAsset } from './types';
const mapSuits = <T,>(fn: (suit: Suit) => T) => Object.fromEntries(SUITS.map(s => [s, fn(s)])) as Record<Suit, T>;
const colors = { hearts: '#F34B61', diamonds: '#F5C544', clubs: '#38BA87', spades: '#528FFF' };
const inks = { hearts: '#B6223C', diamonds: '#795600', clubs: '#126747', spades: '#2351A4' };
const names = { hearts: 'Power', diamonds: 'Speed', clubs: 'Life', spades: 'Signal' };
const retroPaths: Record<Suit, string[]> = {
  hearts: ['M12 18h24v12h28V18h24v36L50 90 12 54Z'],
  diamonds: ['m50 5 40 45-40 45L10 50Z'],
  clubs: ['M36 8h28v28h28v28H64v14h12v16H24V78h12V64H8V36h28Z'],
  spades: ['m50 6 40 40v24H64v12h12v12H24V82h12V70H10V46Z'],
};
export const DECK_THEMES: Record<DeckId, DeckTheme> = {
  classic: {
    id: 'classic', name: 'Klasika', description: 'Čisté hodnoty a tradiční francouzské symboly.', indices: 'paired', back: null,
    suits: mapSuits(s => ({ name: SUIT_NAME_CS[s], ink: s === 'hearts' || s === 'diamonds' ? '#BC3044' : '#27323D', color: colors[s], paths: CLASSIC_PATHS[s], viewBox: '0 0 100 100', filled: true })),
    stickerFor: () => null,
  },
  stormpunk: {
    id: 'stormpunk', name: 'Stormpunk', description: 'Živé město, čtyři frakce a komiksové postavy.', indices: 'four-corners', back: '/decks/stormpunk/back.svg',
    suits: mapSuits((s): SuitStyle => { const f = SUIT_FACTION[s]; return { name: FACTIONS[f].name, ink: FACTIONS[f].ink, color: FACTIONS[f].color, paths: [FACTION_PATHS[f]], viewBox: '0 0 24 24', filled: f === 'vyhen' }; }),
    stickerFor: card => { const art = stormpunkFor(card); return art ? { src: art.stickerAsset, scale: art.scale, offset: art.offset } : null; },
  },
  'retro-arcade': {
    id: 'retro-arcade', name: 'Retro Arcade', fx: { shape: 'pixel', secondary: '#FFF6DB' }, description: 'Geometrické postavy, herní stroje a energie arkád.', indices: 'four-corners', back: '/decks/retro-arcade/back.svg',
    suits: mapSuits(s => ({ name: `${SUIT_NAME_CS[s]} · ${names[s]}`, ink: inks[s], color: colors[s], paths: retroPaths[s], viewBox: '0 0 100 100', filled: true })),
    stickerFor: card => { const art = RETRO_ARCADE_CARDS.find(e => e.card.suit === card.suit && e.card.rank === card.rank); return art ? { src: art.stickerAsset } : null; },
  },
};
export const TABLE_THEMES: Record<TableId, TableTheme> = {
  stormpunk: { id: 'stormpunk', name: 'Městská aréna', geometry: 'oval', background: '#101827', surface: '#162237', rail: '#a3b2c426', grid: '#34445a24',
    light: { background: '#e9dfcf', surface: '#e1d1b8', rail: '#9a78547a', grid: '#92785126', secondary: '#a36a29' },
    colors: mapSuits(s => FACTIONS[SUIT_FACTION[s]].color), secondary: '#FFE5AF',
    ambient: { hearts: 'm210 272 4 8-4 9-4-9Z', diamonds: 'M130 270h78m-55 8h31m606-128h78', clubs: 'M188 278q25-29 41-13-1 22-41 13Z', spades: 'm185 263 18 2-9 14 25-2m593-127-18-2 9-14-25 2' } },
  'retro-arcade': { id: 'retro-arcade', name: 'Noční herna', geometry: 'cabinet', background: '#18152D', surface: '#241E3C', rail: '#E597F263', grid: '#9D69CB20', colors, secondary: '#F5C544',
    light: { background: '#eee4d9', surface: '#ded0c9', rail: '#88658285', grid: '#916b8b24', secondary: '#885b83' },
    ambient: { hearts: 'M160 260h12v-12h12v12h12v12h-12v12h-12v-12h-12Z', diamonds: 'm160 260 14 12-14 12m24-24 14 12-14 12', clubs: 'M164 248h12v12h12v12h-12v12h-12v-12h-12v-12h12Z', spades: 'M790 144v-12h12v12m-24 0v-24h36v24m-48 0v-36h60v36' } },
};
export const EDITIONS = [DECK_THEMES.stormpunk, DECK_THEMES['retro-arcade']] as const;
export function isDeckId(id: unknown): id is DeckId { return typeof id === 'string' && Object.hasOwn(DECK_THEMES, id); }
export function isTableId(id: unknown): id is TableId { return typeof id === 'string' && Object.hasOwn(TABLE_THEMES, id); }
