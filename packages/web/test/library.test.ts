import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GAME_IDS, GAME_INFO, LEARN_LABEL, ROOM_MAX_PLAYERS, gamesForPlayers } from '@balik/shared';
import { GameLibrary, SEAT_OPTIONS, defaultBots, fitsSeats } from '../src/library/GameLibrary';
import { GameMotif } from '../src/library/GameMotif';

describe('game library', () => {
  it('describes every registered game honestly enough to choose it', () => {
    for (const id of GAME_IDS) {
      const info = GAME_INFO[id];
      expect(info.pitch.length, id).toBeGreaterThan(30);
      expect(info.pitch, `${id}: no invented durations`).not.toMatch(/min(ut)?/i);
      expect(info.family, id).toBeTruthy();
      expect(LEARN_LABEL[info.learn], id).toBeTruthy();
      for (const bots of info.botCounts) expect(info.players, `${id} solo with ${bots}`).toContain(bots + 1);
    }
  });

  it('renders one title per game with its own motif, in registry order', () => {
    const html = renderToStaticMarkup(createElement(GameLibrary, { selected: 'sedma', onSelect: () => {}, seats: null }));
    const order = [...html.matchAll(/data-game="([a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([...GAME_IDS]);
    expect(html.match(/role="radio"/g)).toHaveLength(GAME_IDS.length);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toContain('data-game="sedma"');
    for (const id of GAME_IDS) expect(renderToStaticMarkup(createElement(GameMotif, { id }))).toContain(`motif-${id}`);
  });

  it('motifs never depend on the chosen deck edition', () => {
    const html = renderToStaticMarkup(createElement(GameMotif, { id: 'prsi' }));
    expect(html).not.toMatch(/<img|stickers|\/decks\//);
  });

  it('explains which games a table size cannot start', () => {
    expect(SEAT_OPTIONS).toEqual(Array.from({ length: ROOM_MAX_PLAYERS }, (_, i) => i + 1));
    expect(gamesForPlayers(3)).toContain('marias');
    expect(gamesForPlayers(3)).not.toContain('sedma');
    expect(fitsSeats('marias', 2)).toBe(false);
    expect(fitsSeats('marias', null)).toBe(true);
    const html = renderToStaticMarkup(createElement(GameLibrary, { selected: 'prsi', onSelect: () => {}, seats: 3 }));
    expect(html).toContain(GAME_INFO.sedma.needPlayers);
    expect(html).toContain(GAME_INFO.snaps.needPlayers);
    expect(html).not.toContain(GAME_INFO.marias.needPlayers);
  });

  it('offers the computer opponents that fill the chosen table', () => {
    expect(defaultBots('prsi', 4)).toBe(3);
    expect(defaultBots('marias', null)).toBe(2);
    expect(defaultBots('sedma', 3, 2)).toBe(1); // 3 seats cannot start Sedma; fall back to its first option
    expect(defaultBots('durak', null, 2)).toBe(2);
    expect(defaultBots('snaps', 4, 3)).toBe(1);
  });
});
