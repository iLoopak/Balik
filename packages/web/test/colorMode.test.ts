import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDeck32, SUITS } from '@balik/shared';
import {
  COLOR_MODE_KEY,
  parseColorMode,
  resolveColorMode,
  setColorMode,
  startColorModeSync,
  useColorMode,
} from '../src/themes/colorMode';
import { contrastRatio, lightEffectInk } from '../src/themes/colorContrast';
import { ColorModePicker } from '../src/themes/ColorModePicker';
import { DECK_THEMES, TABLE_THEMES } from '../src/themes/registry';
import { useAppearance } from '../src/themes/preferences';
import { CardView } from '../src/cards/Card';
import { GameTableTheme } from '../src/table/GameTableTheme';
import { computeGeometry } from '../src/table/layout';
import { effectTheme } from '../src/effects/effectTokens';
import { EffectOrchestrator } from '../src/effects/EffectOrchestrator';
import type { EffectInstance } from '../src/effects/effectEvents';
import { previewScenario } from '../src/effects/previewScenarios';

afterEach(() => {
  useColorMode.setState({ preference: 'system', mode: 'dark' });
  vi.unstubAllGlobals();
});
describe('application colour mode', () => {
  it('validates preferences and resolves system mode without depending on an edition', () => {
    for (const value of [null, undefined, 'auto', 'constructor', '{}', 7, {}])
      expect(parseColorMode(value)).toBe('system');
    expect(resolveColorMode('light', true)).toBe('light');
    expect(resolveColorMode('dark', false)).toBe('dark');
    expect(resolveColorMode('system', true)).toBe('dark');
    expect(resolveColorMode('system', false)).toBe('light');
  });
  it('applies the saved/system palette before React and survives denied storage', () => {
    const script = readFileSync(new URL('../public/color-mode.js', import.meta.url), 'utf8');
    for (const saved of ['light', 'dark', 'system', 'invalid', null, 'denied'])
      for (const systemDark of [false, true]) {
        const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> },
          setAttribute = vi.fn();
        runInNewContext(script, {
          localStorage: {
            getItem() {
              if (saved === 'denied') throw Error('denied');
              return saved;
            },
          },
          window: { matchMedia: () => ({ matches: systemDark }) },
          document: { documentElement: root, querySelector: () => ({ setAttribute }) },
        });
        const mode = resolveColorMode(parseColorMode(saved), systemDark);
        expect(root.dataset.colorMode).toBe(mode);
        expect(root.style.colorScheme).toBe(mode);
        expect(setAttribute).toHaveBeenLastCalledWith('content', mode === 'light' ? '#f5f0e6' : '#10141f');
      }
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html.indexOf('/color-mode.js')).toBeLessThan(html.indexOf('/src/main.tsx'));
  });
  it('keeps explicit choice across system changes, syncs tabs, and cleans up listeners', () => {
    const root = { dataset: {}, style: {} },
      setAttribute = vi.fn(),
      setItem = vi.fn();
    const listeners = new Map<string, (event: any) => void>();
    const media = {
      matches: false,
      addEventListener: vi.fn((name, fn) => listeners.set('media', fn)),
      removeEventListener: vi.fn(),
    };
    const win = {
      matchMedia: () => media,
      addEventListener: vi.fn((name, fn) => listeners.set(name, fn)),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', { documentElement: root, querySelector: () => ({ setAttribute }) });
    vi.stubGlobal('localStorage', { setItem });
    const appearance = { ...useAppearance.getState() };
    const stop = startColorModeSync();
    expect(useColorMode.getState().mode).toBe('light');
    setColorMode('dark');
    expect(setItem).toHaveBeenLastCalledWith(COLOR_MODE_KEY, 'dark');
    media.matches = true;
    listeners.get('media')!({});
    media.matches = false;
    listeners.get('media')!({});
    expect(useColorMode.getState().mode).toBe('dark');
    setColorMode('system');
    expect(useColorMode.getState().mode).toBe('light');
    media.matches = true;
    listeners.get('media')!({});
    expect(useColorMode.getState().mode).toBe('dark');
    listeners.get('storage')!({ key: COLOR_MODE_KEY, newValue: 'light' });
    expect(useColorMode.getState().mode).toBe('light');
    listeners.get('storage')!({ key: 'unrelated', newValue: 'dark' });
    expect(useColorMode.getState().mode).toBe('light');
    setItem.mockImplementation(() => {
      throw Error('denied');
    });
    expect(() => setColorMode('dark')).not.toThrow();
    expect(useAppearance.getState()).toEqual(appearance);
    stop();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', listeners.get('media'));
    expect(win.removeEventListener).toHaveBeenCalledWith('storage', listeners.get('storage'));
    const picker = renderToStaticMarkup(createElement(ColorModePicker));
    expect(picker).toContain('Světlo');
    expect(picker).toContain('Podle systému');
    expect(picker.match(/aria-pressed="true"/g)).toHaveLength(1);
  });
  it('retains every card asset, index ink and concealed back in both modes', () => {
    for (const deck of Object.values(DECK_THEMES))
      for (const card of createDeck32()) {
        const asset = deck.stickerFor(card),
          ink = deck.suits[card.suit].ink;
        useColorMode.setState({ mode: 'dark' });
        const back = renderToStaticMarkup(createElement(CardView, { card, faceUp: false, deck: deck.id }));
        useColorMode.setState({ mode: 'light' });
        expect(renderToStaticMarkup(createElement(CardView, { card, faceUp: false, deck: deck.id }))).toBe(
          back,
        );
        const face = renderToStaticMarkup(
          createElement(CardView, { card, faceUp: true, deck: deck.id, fx: { current: true } }),
        );
        expect(face).toContain(`color:${ink}`);
        if (asset) expect(face).toContain(asset.src);
        expect(deck.stickerFor(card)).toEqual(asset);
        expect(face).toContain('class="card-base"');
        expect(face).toContain('data-layer="card-effect"');
      }
  });
  it('renders light materials and bounded static texture for both table geometries at phone and desktop sizes', () => {
    for (const theme of Object.values(TABLE_THEMES))
      for (const [w, h] of [
        [360, 580],
        [1440, 900],
      ]) {
        const geo = computeGeometry(w!, h!, ['a', 'b', 'c', 'd'], 'a', 7);
        for (const mode of ['light', 'dark'] as const) {
          const html = renderToStaticMarkup(
            createElement(GameTableTheme, {
              geo,
              suit: 'hearts',
              myTurn: true,
              reduced: true,
              lite: false,
              theme: theme.id,
              colorMode: mode,
            }),
          );
          expect(html).toContain(`data-color-mode="${mode}"`);
          expect(html).toContain(
            `--arena-background:${mode === 'light' ? theme.light.background : theme.background}`,
          );
          expect(html).toContain('data-ambient="static"');
          expect(html).toContain('data-motion="off"');
          expect(html).toContain('arena-material-grain');
          expect(html.match(/class="arena-seat-dock"/g)).toHaveLength(3);
        }
      }
  });
  it('keeps effect counts, cues and reduced-motion budgets while binding light ink contrast', () => {
    for (const deck of Object.values(DECK_THEMES))
      for (const suit of SUITS) {
        const light = effectTheme(suit, deck.id, 'light'),
          dark = effectTheme(suit, deck.id, 'dark');
        expect(light.shape).toBe(dark.shape);
        expect(light.rotation).toBe(dark.rotation);
        expect(contrastRatio(light.color, '#fffaf2')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(light.secondary, '#fffaf2')).toBeGreaterThanOrEqual(4.5);
      }
    expect(lightEffectInk('#ffffff')).not.toBe('#ffffff');
    const geo = computeGeometry(360, 580, ['me', 'ada'], 'me', 4);
    const items: EffectInstance[] = ['play', 'draw', 'penalty', 'skip', 'suit', 'danger', 'win'].map(
      (kind, i) => ({
        kind: 'effect',
        id: i + 1,
        event: { kind: kind as any, suit: 'hearts', targetPlayerId: 'ada', label: 'Ada' },
        scale: 1,
        ttl: 900,
      }),
    );
    for (const mode of ['light', 'dark'] as const) {
      useColorMode.setState({ mode });
      const html = renderToStaticMarkup(
        createElement(EffectOrchestrator, { items, geo, me: 'me', reduced: true }),
      );
      expect(html.match(/class="game-fx-instance"/g)).toHaveLength(7);
      expect(html).toContain('fx-quality-reduced');
      expect(html).not.toContain('class="game-fx-flight ');
    }
    const replay = (mode: 'light' | 'dark') => {
      useColorMode.setState({ mode });
      const scene = previewScenario('chain', 'hearts');
      let display = scene.initial;
      const events = [];
      for (const step of scene.steps) {
        const before = display;
        display = step.apply?.(before) ?? before;
        events.push(...(step.effects?.(before, display) ?? []));
      }
      return { display, events };
    };
    // Flash pulse ids are process-global nonces; a second replay allocates new ones.
    const stable = (value: unknown) =>
      JSON.parse(JSON.stringify(value, (key, v) => (key === 'flash' && v ? { ...v, id: 0 } : v)));
    expect(stable(replay('light'))).toEqual(stable(replay('dark')));
  });
  it('uses contrast-bound semantic text and effect colours in the ivory palette', () => {
    const css = readFileSync(new URL('../src/themes/colorTokens.css', import.meta.url), 'utf8');
    const light = css.split(":root[data-color-mode='light'] {")[1]!.split('}')[0]!;
    const values = Object.fromEntries(
      [...light.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]),
    );
    for (const key of [
      'ink',
      'muted',
      'faint',
      'accent-text',
      'danger-ink',
      'truth-ink',
      'lie-ink',
      'team-0',
      'team-1',
      'lhar-ink',
      'fx-penalty',
      'fx-skip',
      'fx-win',
    ])
      expect(contrastRatio(values[key]!, values.bg!), key).toBeGreaterThanOrEqual(4.5);
    expect(css).not.toMatch(/var\(--[\w-]+\)[a-f0-9]{2}(?:[;, ])/i);
  });
});
