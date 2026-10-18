import { SUITS, SUIT_NAME_CS, type Suit } from '@balik/shared';
import { stormpunkFor } from '../decks/stormpunk/manifest';
import { FACTIONS, SUIT_FACTION } from '../decks/stormpunk/tokens';
import { FACTION_PATHS } from '../decks/stormpunk/FactionIcon';
import { CLASSIC_PATHS } from './decks/classic';
import { RETRO_ARCADE_CARDS } from './decks/retro-arcade/manifest';
import { MARIASKY_CARDS } from './decks/mariasky/manifest';
import { STRASIDLA_CARDS } from './decks/strasidla/manifest';
import { COLLECTION_DECKS, COLLECTION_TABLES } from './decks/collections.generated';
import type { DeckId, DeckTheme, TableId, TableTheme, SuitStyle } from './types';
export type { DeckId, DeckTheme, TableId, TableTheme, StickerAsset } from './types';
const mapSuits = <T,>(fn: (suit: Suit) => T) => Object.fromEntries(SUITS.map(s => [s, fn(s)])) as Record<Suit, T>;
const colors = { hearts: '#F34B61', diamonds: '#F5C544', clubs: '#38BA87', spades: '#528FFF' };
const inks = { hearts: '#B6223C', diamonds: '#795600', clubs: '#126747', spades: '#2351A4' };
const names = { hearts: 'Power', diamonds: 'Speed', clubs: 'Life', spades: 'Signal' };
const STRASIDLA_SUITS: Record<Suit, Pick<SuitStyle, 'name' | 'ink' | 'color' | 'paths'>> = {
  hearts: { name: 'Oheň', ink: '#A82C1A', color: '#D9432B', paths: ['M50 4C62 26 82 38 82 64 82 84 68 96 50 96S18 84 18 64C18 48 28 40 34 30 38 44 44 48 50 50 46 36 44 20 50 4Z'] },
  diamonds: { name: 'Noc', ink: '#4E33A0', color: '#6C4BC2', paths: ['M60 6A45 45 0 1 0 60 94A36 36 0 1 1 60 6Z', 'M80 34l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z'] },
  clubs: { name: 'Les', ink: '#33612A', color: '#4E8A3A', paths: ['M50 2 78 38H62L86 66H66L92 90H8L34 66H14L38 38H22Z', 'M43 88h14v12H43Z'] },
  // Drop with a counter-wound wave cut out, so it never reads as the flame.
  spades: { name: 'Voda', ink: '#0F6470', color: '#1F8E9E', paths: ['M50 4C66 30 84 48 84 66 84 84 68 96 50 96S16 84 16 66C16 48 34 30 50 4ZM28 62v9q11-8 22 0t22 0v-9q-11-8-22 0t-22 0Z'] },
};
const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 1 ${2 * r} 0a${r} ${r} 0 1 1 ${-2 * r} 0Z`;
// Kontrast: colour-blind-safe inks (≥ 5.7:1 on white) and a pattern per suit for monochrome reading.
const KONTRAST_SUITS: Record<Suit, Pick<SuitStyle, 'name' | 'ink' | 'color' | 'paths'>> = {
  hearts: { name: 'Srdce', ink: '#B83200', color: '#B83200', paths: [CLASSIC_PATHS.hearts[0]!] },
  diamonds: { name: 'Káry', ink: '#0060A8', color: '#0060A8', paths: [`${CLASSIC_PATHS.diamonds[0]}M34 30v6h32v-6ZM28 47v6h44v-6ZM34 64v6h32v-6Z`] },
  clubs: { name: 'Kříže', ink: '#00745A', color: '#00745A', paths: [...CLASSIC_PATHS.clubs.slice(0, 3).map((d, i) => d + ring([50, 29, 71][i]!, [29, 59, 59][i]!, 7)), ...CLASSIC_PATHS.clubs.slice(3)] },
  spades: { name: 'Piky', ink: '#141414', color: '#141414', paths: CLASSIC_PATHS.spades },
};
const MARIASKY_SUITS: Record<Suit, Pick<SuitStyle, 'name' | 'ink' | 'color' | 'paths'>> = {
  hearts: { name: 'Srdce', ink: '#9E1F28', color: '#C8323A', paths: ['M50 90C22 70 8 52 8 33 8 18 19 9 31 9c9 0 15 5 19 12 4-7 10-12 19-12 12 0 23 9 23 24 0 19-14 37-42 57Z'] },
  // Bell with its loop and a counter-wound slot so the sound hole stays open.
  diamonds: { name: 'Kule', ink: '#8A5F00', color: '#F2B51F', paths: ['M50 2a9 9 0 1 1 0 18a9 9 0 1 1 0-18Zm0 5a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z', 'M50 18a37 37 0 1 1 0 74a37 37 0 1 1 0-74ZM20 58v9h26v18h8V67h26v-9Z'] },
  spades: { name: 'Listy', ink: '#23592A', color: '#3D7F3F', paths: ['M50 6C76 26 90 46 86 64 82 80 66 86 55 78v18H45V78C34 86 18 80 14 64 10 46 24 26 50 6Z'] },
  clubs: { name: 'Žaludy', ink: '#4A2E14', color: '#6A4524', paths: ['M46 0h8v12h-8Z', 'M14 44c0-20 16-32 36-32s36 12 36 32Z', 'M22 50h56c0 24-9 40-28 48-19-8-28-24-28-48Z'] },
};
const retroPaths: Record<Suit, string[]> = {
  hearts: ['M12 18h24v12h28V18h24v36L50 90 12 54Z'],
  diamonds: ['m50 5 40 45-40 45L10 50Z'],
  clubs: ['M36 8h28v28h28v28H64v14h12v16H24V78h12V64H8V36h28Z'],
  spades: ['m50 6 40 40v24H64v12h12v12H24V82h12V70H10V46Z'],
};
export const DECK_THEMES: Record<DeckId, DeckTheme> = {
  ...COLLECTION_DECKS,
  classic: {
    id: 'classic', name: 'Klasika', center: 'symbols', description: 'Čisté hodnoty a tradiční francouzské symboly.', indices: 'paired', back: null,
    suits: mapSuits(s => ({ name: SUIT_NAME_CS[s], ink: s === 'hearts' || s === 'diamonds' ? '#BC3044' : '#27323D', color: colors[s], paths: CLASSIC_PATHS[s], viewBox: '0 0 100 100', filled: true })),
    stickerFor: () => null,
  },
  stormpunk: {
    id: 'stormpunk', name: 'Stormpunk', description: 'Živé město, čtyři frakce a komiksové postavy.', indices: 'four-corners', back: '/decks/art-backs/stormpunk.webp',
    suits: mapSuits((s): SuitStyle => { const f = SUIT_FACTION[s]; return { name: FACTIONS[f].name, ink: FACTIONS[f].ink, color: FACTIONS[f].color, paths: [FACTION_PATHS[f]], viewBox: '0 0 24 24', filled: f === 'vyhen' }; }),
    stickerFor: card => { const art = stormpunkFor(card); return art ? { src: art.stickerAsset, scale: art.scale, offset: art.offset } : null; },
  },
  'retro-arcade': {
    id: 'retro-arcade', name: 'Retro Arcade', fx: { shape: 'pixel', secondary: '#FFF6DB' }, description: 'Geometrické postavy, herní stroje a energie arkád.', indices: 'four-corners', back: '/decks/retro-arcade/back.svg',
    suits: mapSuits(s => ({ name: `${SUIT_NAME_CS[s]} · ${names[s]}`, ink: inks[s], color: colors[s], paths: retroPaths[s], viewBox: '0 0 100 100', filled: true })),
    stickerFor: card => { const art = RETRO_ARCADE_CARDS.find(e => e.card.suit === card.suit && e.card.rank === card.rank); return art ? { src: art.stickerAsset } : null; },
  },
  mariasky: {
    id: 'mariasky', name: 'Mariášky', fx: { shape: 'tulip', secondary: '#E3A62B' }, description: 'Srdce, kule, listy a žaludy. Moderní linoryt české hospody.', indices: 'four-corners', back: '/decks/mariasky/back.svg',
    // German suits shown over the engine's French ones: hearts→srdce, diamonds→kule, spades→listy, clubs→žaludy.
    suits: mapSuits(s => ({ ...MARIASKY_SUITS[s], viewBox: '0 0 100 100', filled: true })),
    // Svršek changes the suit in Czech Prší, exactly like the engine's Q.
    ranks: { '7': { index: 'VII', name: 'sedma' }, '8': { index: 'VIII', name: 'osma' }, '9': { index: 'IX', name: 'devítka' }, '10': { index: 'X', name: 'desítka' },
      J: { index: 'Sp', name: 'spodek' }, Q: { index: 'Sv', name: 'svršek' }, K: { index: 'K', name: 'král' }, A: { index: 'E', name: 'eso' } },
    stickerFor: card => { const art = MARIASKY_CARDS.find(e => e.card.suit === card.suit && e.card.rank === card.rank); return art ? { src: art.stickerAsset } : null; },
  },
  strasidla: {
    id: 'strasidla', name: 'Strašidla', fx: { shape: 'spark', secondary: '#FFE36E' }, description: 'Čerti, bludičky, hejkalové a vodníci. Česká strašidla se svítícíma očima.', indices: 'four-corners', back: '/decks/strasidla/back.svg',
    // Four worlds over the engine's suits: hearts→Oheň, diamonds→Noc, clubs→Les, spades→Voda.
    suits: mapSuits(s => ({ ...STRASIDLA_SUITS[s], viewBox: '0 0 100 100', filled: true })),
    stickerFor: card => { const art = STRASIDLA_CARDS.find(e => e.card.suit === card.suit && e.card.rank === card.rank); return art ? { src: art.stickerAsset } : null; },
  },
  kontrast: {
    id: 'kontrast', name: 'Kontrast', center: 'symbols', fx: { shape: 'dash', secondary: '#FFFFFF' }, description: 'Velké indexy, vzorované symboly a barvy čitelné i pro barvoslepé.', indices: 'paired', back: '/decks/kontrast/back.svg',
    suits: mapSuits(s => ({ ...KONTRAST_SUITS[s], viewBox: '0 0 100 100', filled: true })),
    stickerFor: () => null,
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
  ...COLLECTION_TABLES,
};
export const EDITIONS = [DECK_THEMES.stormpunk, DECK_THEMES['retro-arcade'], DECK_THEMES.mariasky, DECK_THEMES.strasidla, DECK_THEMES.kontrast, ...Object.values(COLLECTION_DECKS)] as const;
export function isDeckId(id: unknown): id is DeckId { return typeof id === 'string' && Object.hasOwn(DECK_THEMES, id); }
export function isTableId(id: unknown): id is TableId { return typeof id === 'string' && Object.hasOwn(TABLE_THEMES, id); }
