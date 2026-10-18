import { SUITS, SUIT_NAME_CS, type Suit } from '@balik/shared';
import { stormpunkFor } from '../decks/stormpunk/manifest';
import { FACTIONS, SUIT_FACTION } from '../decks/stormpunk/tokens';
import { FACTION_PATHS } from '../decks/stormpunk/FactionIcon';
import { CLASSIC_PATHS } from './decks/classic';
import { RETRO_ARCADE_CARDS } from './decks/retro-arcade/manifest';
import type { ConsolePalette, DeckId, DeckTheme, TableId, TableTheme, SuitStyle } from './types';
export type { ConsolePalette, DeckId, DeckTheme, TableId, TableTheme, TableTone, StickerAsset } from './types';
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
// The console is BALÍK's own: both tables share one apparatus and differ only in material.
const IVORY: ConsolePalette = {
  bg: '#e4d9c4', spot: '#f4ede0', frame: '#5c4a3036', pattern: '#6b5636',
  bezel: '#d8cab0', edge: '#7a643f45', faceTop: '#fbf7ee', faceBottom: '#efe6d5', highlight: '#ffffff',
  wellTop: '#c9b896', wellBottom: '#dccdb0', wellLip: '#fffaf0',
  line: '#4b3b2640', pad: '#efe6d4', trayTop: '#f3ecdf', trayBottom: '#e3d6bd',
  amber: '#c47a0c', shadow: '#5a4123', shadowOpacity: .28, engrave: '#6d5a3f',
};
export const TABLE_THEMES: Record<TableId, TableTheme> = {
  stormpunk: { id: 'stormpunk', name: 'Městská aréna', cut: 'soft', colors: mapSuits(s => FACTIONS[SUIT_FACTION[s]].color), secondary: '#FFE5AF',
    tones: {
      dark: { bg: '#0a111e', spot: '#17243b', frame: '#8ea6c42b', pattern: '#9fb6d4',
        bezel: '#0d1626', edge: '#a9bdd63a', faceTop: '#1b2a43', faceBottom: '#111c2f', highlight: '#d6e4f64d',
        wellTop: '#060b15', wellBottom: '#0c1525', wellLip: '#c8d8ee26',
        line: '#9fb4d038', pad: '#121d30', trayTop: '#14213a', trayBottom: '#0a1120',
        amber: '#ffb23f', shadow: '#000000', shadowOpacity: .6, engrave: '#8fa3be' },
      light: IVORY,
    } },
  'retro-arcade': { id: 'retro-arcade', name: 'Noční herna', cut: 'hard', colors, secondary: '#F5C544',
    tones: {
      dark: { bg: '#130f24', spot: '#271f45', frame: '#e597f230', pattern: '#c79be8',
        bezel: '#171229', edge: '#e597f247', faceTop: '#2a2148', faceBottom: '#1b1531', highlight: '#f1d6ff4d',
        wellTop: '#0b0817', wellBottom: '#151027', wellLip: '#e9c4ff26',
        line: '#c79be83d', pad: '#1c1633', trayTop: '#221a3d', trayBottom: '#120e21',
        amber: '#f5c544', shadow: '#000000', shadowOpacity: .6, engrave: '#b39ccf' },
      light: { ...IVORY, bg: '#e2d9cc', frame: '#5a3f6a33', pattern: '#5e4472', edge: '#6e4f7f45', line: '#4a325c3d', engrave: '#6a5378', amber: '#b9820b' },
    } },
};
export const EDITIONS = [DECK_THEMES.stormpunk, DECK_THEMES['retro-arcade']] as const;
export function isDeckId(id: unknown): id is DeckId { return typeof id === 'string' && Object.hasOwn(DECK_THEMES, id); }
export function isTableTone(tone: unknown): tone is 'dark' | 'light' { return tone === 'dark' || tone === 'light'; }
export function isTableId(id: unknown): id is TableId { return typeof id === 'string' && Object.hasOwn(TABLE_THEMES, id); }
