import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DECK_THEMES, EDITIONS, TABLE_THEMES } from '../src/themes/registry';
import { DEFAULT_APPEARANCE, setAppearance, useAppearance } from '../src/themes/preferences';
import { DeckFan, TableStage, deckTraits, showroomDecks, showroomTables } from '../src/themes/Showroom';
import { ShowroomContent } from '../src/themes/AppearanceDialog';
import { closeAppearance, openAppearance, useAppearanceDialog } from '../src/themes/appearanceStore';

describe('appearance showroom', () => {
  afterEach(() => { useAppearance.setState({ ...DEFAULT_APPEARANCE }); closeAppearance(); vi.unstubAllGlobals(); });

  it('lists every registered deck and table exactly once, curated editions first', () => {
    const decks = showroomDecks().map((t) => t.id);
    expect(new Set(decks).size).toBe(decks.length);
    expect([...decks].sort()).toEqual(Object.keys(DECK_THEMES).sort());
    expect(decks.slice(0, EDITIONS.length)).toEqual(EDITIONS.map((t) => t.id));
    expect(decks).toContain('classic');
    expect(showroomTables().map((t) => t.id)).toEqual(Object.keys(TABLE_THEMES));
  });

  it('presents Kontrast as the most legible choice, not a lesser one', () => {
    expect(deckTraits(DECK_THEMES.kontrast)[0]).toBe('Nejčitelnější');
    expect(deckTraits(DECK_THEMES.mariasky).join()).toContain('Sp · Sv · E');
    expect(deckTraits(DECK_THEMES.classic)).toContain('Bez ilustrací');
  });

  it('previews with the real renderers: CardView of the deck on the real table material', () => {
    for (const table of Object.keys(TABLE_THEMES) as (keyof typeof TABLE_THEMES)[]) {
      const html = renderToStaticMarkup(createElement(TableStage, { deck: 'mariasky', table }));
      expect(html).toContain(`data-table-theme="${table}"`);
      expect(html).toContain('data-deck="mariasky"');
      expect(html).toContain('card-deck-mariasky');
    }
    const fan = renderToStaticMarkup(createElement(DeckFan, { deck: 'strasidla' }));
    expect(fan).toContain('/decks/strasidla/back.svg');
    expect(fan.match(/class="card /g)).toHaveLength(3);
  });

  it('offers every deck and table in one dialog and opens from any game', () => {
    openAppearance('marias');
    expect(useAppearanceDialog.getState()).toEqual({ open: true, game: 'marias' });
    const html = renderToStaticMarkup(createElement(ShowroomContent, { game: useAppearanceDialog.getState().game }));
    for (const id of Object.keys(DECK_THEMES)) expect(html).toContain(`edition-option is-${id}`);
    expect(html.match(/class="table-stage"/g)).toHaveLength(Object.keys(TABLE_THEMES).length + 1);
    expect(html).toContain('Vidíš jen ty');
    expect(html).toContain('Mariáš běží dál');
  });

  it('changing the deck keeps the table and the other way round', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
    setAppearance({ table: 'retro-arcade' });
    setAppearance({ deck: 'kontrast' });
    expect(useAppearance.getState()).toEqual({ deck: 'kontrast', table: 'retro-arcade' });
    expect(JSON.parse(storage.get('balik.appearance')!)).toEqual({ deck: 'kontrast', table: 'retro-arcade' });
  });
});
