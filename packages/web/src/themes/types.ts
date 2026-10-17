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
export interface TableTheme {
  id: TableId; name: string; geometry: 'oval' | 'cabinet';
  background: string; surface: string; rail: string; grid: string;
  colors: Record<Suit, string>; secondary: string;
  ambient: Record<Suit, string>;
}
