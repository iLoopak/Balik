import type { Card, Suit } from '@balik/shared';
export type DeckId = 'classic' | 'stormpunk' | 'retro-arcade';
export type TableId = 'stormpunk' | 'retro-arcade';
export interface StickerAsset { src: string; scale?: number; offset?: [number, number]; rotation?: number }
export interface SuitStyle { name: string; ink: string; color: string; paths: readonly string[]; viewBox: string; filled: boolean }
export interface DeckTheme {
  id: DeckId; name: string; description: string; indices: 'paired' | 'four-corners';
  fx?: { shape: 'spark' | 'dash' | 'leaf' | 'bolt' | 'pixel'; secondary: string };
  suits: Record<Suit, SuitStyle>; back: string | null;
  stickerFor(card: Card): StickerAsset | null;
}
export type TableTone = 'dark' | 'light';
/** Material of the BALÍK console in one tone. Shape and zoning never change with the palette. */
export interface ConsolePalette {
  bg: string; spot: string; frame: string; pattern: string;
  bezel: string; edge: string; faceTop: string; faceBottom: string; highlight: string;
  wellTop: string; wellBottom: string; wellLip: string;
  line: string; pad: string; trayTop: string; trayBottom: string;
  amber: string; shadow: string; shadowOpacity: number; engrave: string;
}
export interface TableTheme {
  id: TableId; name: string;
  /** `soft` rounds the console's cut corners, `hard` keeps them crisp. */
  cut: 'soft' | 'hard';
  tones: Record<TableTone, ConsolePalette>;
  colors: Record<Suit, string>; secondary: string;
}
