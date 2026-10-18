import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  AVATAR_IDS,
  defaultAvatarId,
  createGameRound,
  gameViewFor,
  mulberry32,
  type AnyRoomView,
} from '@balik/shared';
import { Avatar } from '../src/avatars/Avatar';
import { AVATAR_CATALOG, avatarFor } from '../src/avatars/catalog';
import { AvatarChoices } from '../src/avatars/AvatarPicker';
import { AVATAR_KEY, setAvatarPreference, useAvatarPreference } from '../src/avatars/preferences';
import { avatarTurn } from '../src/avatars/status';
import { useAppearance } from '../src/themes/preferences';
import EditionGallery from '../src/decks/EditionGallery';
import { GALLERY_EDITIONS, type GalleryDeckId } from '../src/decks/editions';
vi.mock('../src/net/client', () => ({ sendAvatar: vi.fn() }));
vi.mock('../src/net/store', () => ({ useApp: vi.fn() }));

describe('permanent BALÍK player identity', () => {
  it('ships 16 player portraits and 4 different bot portraits, all bounded WebP with alpha', () => {
    expect(AVATAR_CATALOG.map((a) => a.id)).toEqual(AVATAR_IDS);
    expect(AVATAR_CATALOG.filter((a) => a.type === 'player')).toHaveLength(16);
    expect(AVATAR_CATALOG.filter((a) => a.type === 'bot')).toHaveLength(4);
    const hashes = new Set<string>();
    let total = 0;
    for (const art of AVATAR_CATALOG) {
      const bytes = readFileSync(new URL(`../public${art.asset}`, import.meta.url));
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.subarray(8, 16).toString()).toBe('WEBPVP8X');
      expect(bytes[20]! & 16).toBe(16); // VP8X alpha flag
      expect(bytes.readUIntLE(24, 3) + 1).toBe(192);
      expect(bytes.readUIntLE(27, 3) + 1).toBe(192);
      expect(bytes.length).toBeLessThan(20_000);
      total += bytes.length;
      hashes.add(createHash('sha256').update(bytes).digest('hex'));
    }
    expect(hashes.size).toBe(20);
    expect(total).toBeLessThan(300_000);
    expect(avatarFor('bad-url', 'old-seat').id).toBe(defaultAvatarId('old-seat'));
    expect(avatarFor(null, 'old-bot', true).type).toBe('bot');
  });
  it('keeps ring, neutral card backs and status badges separate from the portrait and edition', () => {
    const player = { id: 'ada', name: 'Ada', avatarId: 'sova' as const, bot: true };
    const render = () =>
      renderToStaticMarkup(createElement(Avatar, { player, turn: 'thinking', reduced: true, winner: true }));
    const before = render();
    try {
      useAppearance.setState({ deck: 'retro-arcade', table: 'retro-arcade' });
      expect(render()).toBe(before);
      expect(before).toContain('/avatars/sova.webp');
      expect(before).toContain('data-turn="thinking"');
      expect(before).toContain('data-reduced="true"');
      expect(before).toContain('Přemýšlí…');
      expect(before).toContain('Počítač');
      expect(before).toContain('player-avatar-ring');
      expect(before.match(/<i style=/g)).toHaveLength(3);
      expect(before).not.toContain('/decks/');
      const offline = renderToStaticMarkup(
        createElement(Avatar, { player: { ...player, connected: false }, turn: 'thinking' }),
      );
      expect(offline).toContain('data-turn="idle"');
      expect(offline).not.toContain('Přemýšlí…');
    } finally {
      useAppearance.setState({ deck: 'stormpunk', table: 'stormpunk' });
    }
  });
  it.each(['prsi', 'sedma', 'lhar'] as const)(
    'shows %s turn status only from public state and clears it on disconnect/finish',
    (gameId) => {
      const state = createGameRound(gameId, ['a', 'b'], 0, mulberry32(5)).state;
      const room = {
        gameId,
        game: gameViewFor(state, 'a'),
        you: 'a',
        status: 'playing',
        players: [
          { id: 'a', connected: true },
          { id: 'b', connected: true },
        ],
      } as AnyRoomView;
      const current = room.game!.currentPlayerId;
      expect(avatarTurn(room, current)).toBe(current === 'a' ? 'self' : 'thinking');
      expect(avatarTurn(room, current, false)).toBe('idle');
      expect(avatarTurn({ ...room, status: 'finished' }, current)).toBe('idle');
      const other = current === 'a' ? 'b' : 'a';
      expect(avatarTurn(room, other)).toBe('idle');
      const changed = { ...room, game: { ...room.game!, currentPlayerId: other } } as AnyRoomView;
      expect(avatarTurn(changed, current)).toBe('idle');
    },
  );
  it('renders every unlocked choice with an accessible selection and persists without storage access', () => {
    const html = renderToStaticMarkup(createElement(AvatarChoices, { value: 'gambit', onChange: () => {} }));
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(19);
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    try {
      setAvatarPreference('sova');
      expect(setItem).toHaveBeenLastCalledWith(AVATAR_KEY, 'sova');
      setItem.mockImplementation(() => {
        throw Error('private mode');
      });
      expect(() => setAvatarPreference('mina')).not.toThrow();
      expect(useAvatarPreference.getState().avatarId).toBe('mina');
    } finally {
      setAvatarPreference('vega');
      vi.unstubAllGlobals();
    }
  });
});

it('exposes all 32 Arcade cards in a production gallery using the game CardView', () => {
  const html = renderToStaticMarkup(createElement(EditionGallery, { deck: 'retro-arcade' }));
  expect(html).toContain('32 / 32 karet');
  expect(html.match(/class="gallery-card-item"/g)).toHaveLength(32);
  expect(html).toContain('/?deck=retro-arcade&amp;table=retro-arcade');
  expect(html).not.toContain('/decks/stormpunk/stickers/');
});

it.each(Object.keys(GALLERY_EDITIONS) as GalleryDeckId[])('serves a 32-card gallery for %s', (deck) => {
  const html = renderToStaticMarkup(createElement(EditionGallery, { deck }));
  expect(html.match(/class="gallery-card-item"/g)).toHaveLength(32);
  expect(html).toContain(`/?deck=${deck}`);
  const vercel = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'));
  expect(vercel.rewrites).toContainEqual({ source: `/decks/${deck}`, destination: '/index.html' });
});
