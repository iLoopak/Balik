import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createDeck32 } from '@balik/shared';
import { STORMPUNK_CARDS, stormpunkFor } from '../src/decks/stormpunk/manifest';
import { FACTIONS, FACTION_IDS } from '../src/decks/stormpunk/tokens';
import { stickerFor, suitName } from '../src/cards/skin';

const publicRoot = fileURLToPath(new URL('../public', import.meta.url));

describe('Stormpunk production deck', () => {
  it('covers the exact engine deck without changing card identities', () => {
    expect(STORMPUNK_CARDS).toHaveLength(32);
    expect(new Set(STORMPUNK_CARDS.map((e) => e.id)).size).toBe(32);
    expect(new Set(STORMPUNK_CARDS.map((e) => e.stickerAsset)).size).toBe(32);
    for (const card of createDeck32()) expect(stormpunkFor(card).card).toEqual(card);
    expect(FACTION_IDS.map((id) => FACTIONS[id].name)).toEqual(['Výheň', 'Pohyb', 'Podrost', 'Bouře']);
  });

  it('ships a real, bounded, alpha-enabled WebP for every manifest entry', () => {
    let totalBytes = 0;
    for (const entry of STORMPUNK_CARDS) {
      const asset = publicRoot + entry.stickerAsset;
      const bytes = readFileSync(asset);
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
      expect(bytes.toString('ascii', 12, 16)).toBe('VP8X');
      expect(bytes[20]! & 0x10).toBe(0x10); // WebP extended header alpha flag
      const size = statSync(asset).size;
      expect(size).toBeGreaterThan(1000);
      expect(size).toBeLessThan(250_000);
      totalBytes += size;
    }
    expect(totalBytes).toBeLessThan(5_000_000);
  });

  it('keeps a classic fallback and translates suits only in presentation', () => {
    for (const card of createDeck32()) {
      expect(stickerFor('prsi', card, 'classic')).toBeNull();
      expect(stickerFor('prsi', card, 'stormpunk')?.src).toBe(stormpunkFor(card).stickerAsset);
      expect(suitName(card.suit, 'stormpunk')).toBe(FACTIONS[stormpunkFor(card).faction].name);
    }
    expect(suitName('hearts', 'classic')).toBe('srdce');
  });
});
