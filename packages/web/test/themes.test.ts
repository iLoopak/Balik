import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { applyGameAction, chooseGameBotAction, createDeck32, createGameRound, gameViewFor, mulberry32, type GameId, type GameState } from '@balik/shared';
import { CardView } from '../src/cards/Card';
import { DECK_THEMES, EDITIONS, TABLE_THEMES } from '../src/themes/registry';
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, deckAssetUrls, parseAppearance, preloadDeck, setAppearance, useAppearance } from '../src/themes/preferences';
import { RETRO_ARCADE_CARDS } from '../src/themes/decks/retro-arcade/manifest';
import { stickerFor } from '../src/cards/skin';
import { BrandMascot } from '../src/brand/BrandMascot';
import { EmoteBubble } from '../src/brand/Emotes';
import { GameTableTheme } from '../src/table/GameTableTheme';
import { computeGeometry } from '../src/table/layout';
import { EffectOrchestrator } from '../src/effects/EffectOrchestrator';
import type { EffectInstance } from '../src/effects/effectEvents';
vi.mock('../src/net/client', () => ({ onEmote: vi.fn(), sendEmote: vi.fn() }));
const root = fileURLToPath(new URL('../public', import.meta.url));
afterEach(() => { useAppearance.setState(DEFAULT_APPEARANCE); vi.unstubAllGlobals(); });

describe('interchangeable cosmetic editions', () => {
  it('renders both complete decks with actual layered indices, distinct symbols and stickers in both games', () => {
    for (const theme of EDITIONS) {
      expect(new Set(Object.values(theme.suits).map(s => s.paths.join(' '))).size).toBe(4);
      for (const game of ['prsi', 'sedma'] as const) for (const card of createDeck32()) {
        const html = renderToStaticMarkup(createElement(CardView, { card, faceUp: true, deck: theme.id, game, fx: { current: true } }));
        expect(html).toContain(`>${card.rank}</span>`);
        expect(html).toContain(theme.suits[card.suit].paths[0]);
        expect(html).toContain(theme.stickerFor(card)!.src);
        expect(html).toContain('class="card-base"');
        expect(html).toContain('data-layer="sticker"');
        expect(html).toContain('data-layer="card-effect"');
        expect(stickerFor(game, card, theme.id)).toEqual(theme.stickerFor(card));
      }
    }
  });
  it('renders exactly the same back for every concealed identity, including known cards flipping down', () => {
    expect(new Set(EDITIONS.map(t => t.back)).size).toBe(2);
    for (const theme of EDITIONS) {
      const expected = renderToStaticMarkup(createElement(CardView, { card: null, faceUp: false, deck: theme.id }));
      expect(expected).toContain(theme.back);
      expect(expected).not.toContain('card-front');
      expect(expected).not.toContain('/stickers/');
      for (const card of createDeck32()) expect(renderToStaticMarkup(createElement(CardView, { card, faceUp: false, deck: theme.id }))).toBe(expected);
      expect(readFileSync(root + theme.back!, 'utf8')).toContain('BALÍK');
    }
  });
  it('ships 32 different bounded transparent vector illustrations with no text, scripts or baked card', () => {
    expect(RETRO_ARCADE_CARDS).toHaveLength(32);
    expect(new Set(RETRO_ARCADE_CARDS.map(a => a.name)).size).toBe(32);
    expect(RETRO_ARCADE_CARDS.map(a => a.card)).toEqual(createDeck32());
    const geometries = new Set<string>(); let total = 0;
    for (const art of RETRO_ARCADE_CARDS) {
      const file = root + art.stickerAsset, svg = readFileSync(file, 'utf8');
      expect(svg).toContain('viewBox="0 0 256 256"');
      expect(svg).toContain('feMorphology'); // die-cut follows subject alpha, no canvas rectangle
      expect(svg).not.toMatch(/<text|<script|<image|<foreignObject|https?:\/\/(?!www.w3.org)/);
      expect(svg).not.toMatch(/<rect[^>]*(?:width="256"|height="256")/);
      geometries.add(svg.replace(/#[a-f\d]{6}/gi, '#COLOR'));
      const bytes = statSync(file).size; expect(bytes).toBeLessThan(7000); total += bytes;
    }
    expect(geometries.size).toBe(32); expect(total).toBeLessThan(120_000);
  });
  it('validates storage, keeps choices independent, persists and removes stale URL overrides', () => {
    for (const raw of ['null', '[]', '3', 'invalid', '{"deck":"__proto__","table":"constructor"}']) expect(parseAppearance(raw)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance('{"deck":"retro-arcade","table":"bad"}')).toEqual({ deck: 'retro-arcade', table: 'stormpunk' });
    const setItem = vi.fn(), replaceState = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    vi.stubGlobal('window', { location: { href: 'https://example.test/r/ABCD?deck=classic&keep=1' }, history: { state: null, replaceState } });
    setAppearance({deck:'retro-arcade'});
    expect(useAppearance.getState()).toEqual({deck:'retro-arcade',table:'stormpunk'});
    setAppearance({table:'retro-arcade'});
    setAppearance({deck:'classic'});
    expect(useAppearance.getState()).toEqual({deck:'classic',table:'retro-arcade'});
    expect(JSON.parse(setItem.mock.calls.at(-1)![1])).toEqual(useAppearance.getState());
    expect(setItem.mock.calls.at(-1)![0]).toBe(APPEARANCE_KEY);
    expect(String(replaceState.mock.calls.at(-1)![2])).toBe('https://example.test/r/ABCD?keep=1');
    setItem.mockImplementation(() => { throw new Error('denied'); });
    expect(() => setAppearance({deck:'stormpunk'})).not.toThrow();
  });
  it('falls back to classic indices when a manifest entry is missing, retaining the edition back', () => {
    const theme = DECK_THEMES['retro-arcade'];
    const spy = vi.spyOn(theme, 'stickerFor').mockReturnValue(null);
    try {
      const html = renderToStaticMarkup(createElement(CardView, {card:createDeck32()[0]!, faceUp:true, deck:theme.id}));
      expect(html).toContain('data-deck="classic"'); expect(html).toContain(theme.back);
      expect(html).toContain('>7</span>'); expect(html).not.toContain('data-layer="sticker"');
    } finally { spy.mockRestore(); }
  });
  it('preloads a whole chosen edition, never a hand-dependent subset or the other edition', () => {
    const requested: string[] = [];
    vi.stubGlobal('Image', class { set src(value: string) { requested.push(value); } });
    const stop = preloadDeck('retro-arcade');
    expect(requested).toHaveLength(33); expect(requested).toEqual(deckAssetUrls('retro-arcade'));
    expect(requested.every(s => s.startsWith('/decks/retro-arcade/'))).toBe(true);
    expect(deckAssetUrls('classic')).toEqual([]); stop();
  });
  it.each(['prsi','sedma'] as GameId[])('finishes %s identically while switching appearance at every turn', (game) => {
    function run(switching: boolean) {
      vi.stubGlobal('localStorage', {setItem() {}});
      const rng = mulberry32(71); let state: GameState = createGameRound(game, ['a','b'], 0, rng).state;
      const events: unknown[] = [];
      for (let turn = 0; turn < 2000 && state.phase !== 'finished'; turn++) {
        const before = JSON.stringify(state), view = gameViewFor(state, 'a');
        if (switching) setAppearance({deck: turn % 2 ? 'stormpunk' : 'retro-arcade', table: turn % 3 ? 'retro-arcade' : 'stormpunk'});
        expect(JSON.stringify(state)).toBe(before); expect(gameViewFor(state,'a')).toEqual(view);
        const action = chooseGameBotAction(state,rng), player = state.players[state.currentIndex]!.id;
        const result = applyGameAction(state,player,action,rng); if (!result.ok) throw new Error(result.error);
        events.push(...result.events); state = result.state;
      }
      expect(state.phase).toBe('finished'); return {state, events};
    }
    expect(run(true)).toEqual(run(false));
  });
  it('keeps BLIK and emotes identical and renders both tables at mobile/desktop reduced-motion settings', () => {
    vi.stubGlobal('localStorage', {setItem() {}});
    const emote = {t:'emote' as const,id:'test',code:'DEMO',playerId:'a',emote:'gg' as const,at:0,expiresAt:Infinity};
    const brand = () => renderToStaticMarkup(createElement(BrandMascot,{state:'idle',reduced:true}));
    const bubble = () => renderToStaticMarkup(createElement(EmoteBubble,{author:'Ada',message:emote}));
    const originalBrand=brand(), originalBubble=bubble();
    for (const theme of EDITIONS) {
      setAppearance({deck:theme.id}); expect(brand()).toBe(originalBrand); expect(bubble()).toBe(originalBubble);
      for (const table of Object.values(TABLE_THEMES)) for (const [w,h] of [[360,580],[1440,900]]) {
        const geo=computeGeometry(w!,h!,['a','b'],'a',4);
        const html=renderToStaticMarkup(createElement(GameTableTheme,{geo,suit:'hearts',theme:table.id,reduced:true,lite:false,myTurn:true}));
        expect(html).toContain(`data-table-theme="${table.id}"`); expect(html).toContain('data-ambient="static"'); expect(html).toContain('data-motion="off"');
        const items: EffectInstance[] = [{kind:'effect',id:1,event:{kind:'play',suit:'hearts',label:'Ada hraje'},scale:1,ttl:900}];
        const fx=renderToStaticMarkup(createElement(EffectOrchestrator,{items,geo,me:'a',reduced:true}));
        expect(fx).toContain('data-effect="play"'); expect(fx).toContain('fx-quality-reduced');
      }
    }
  });
});
