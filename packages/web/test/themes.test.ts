import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GAME_IDS, GAME_INFO, applyGameAction, chooseGameBotAction, createDeck32, createGameRound, gameViewFor, mulberry32, type GameState } from '@balik/shared';
import { CardView } from '../src/cards/Card';
import { DECK_THEMES, EDITIONS, TABLE_THEMES } from '../src/themes/registry';
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, deckAssetUrls, parseAppearance, preloadDeck, setAppearance, useAppearance } from '../src/themes/preferences';
import { RETRO_ARCADE_CARDS } from '../src/themes/decks/retro-arcade/manifest';
import { MARIASKY_CARDS } from '../src/themes/decks/mariasky/manifest';
import { STRASIDLA_CARDS } from '../src/themes/decks/strasidla/manifest';
import { COLLECTION_CARDS, COLLECTION_DECK_IDS } from '../src/themes/decks/collections.generated';
import { editionHref, galleryDeckFromPath, GALLERY_EDITIONS } from '../src/decks/editions';
import { cardText, rankLabel } from '../src/cards/skin';
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
const expectValidBack = (src: string) => {
  const bytes = readFileSync(root + src);
  if (src.endsWith('.webp')) {
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
  } else expect(bytes.toString('utf8')).toContain('BALÍK');
};

describe('interchangeable cosmetic editions', () => {
  it('isolates an art proof override to the face sticker, preserving indices and concealed identity', () => {
    const proof={src:'/decks/art-poc/biopunk-hearts-k.webp'};
    const card={id:'hearts-K',suit:'hearts',rank:'K'} as const;
    const face=renderToStaticMarkup(createElement(CardView,{card,faceUp:true,deck:'biopunk',stickerOverride:proof}));
    expect(face).toContain(proof.src); expect(face).toContain('>K</span>');
    expect(face).toContain('data-layer="sticker"'); expect(face).toContain('data-deck="biopunk"');
    expect(face).not.toContain('/decks/biopunk/stickers/hearts-k.svg');
    const concealed=renderToStaticMarkup(createElement(CardView,{card:null,faceUp:false,deck:'biopunk'}));
    for(const card of createDeck32())expect(renderToStaticMarkup(createElement(CardView,{card,faceUp:false,deck:'biopunk',stickerOverride:proof}))).toBe(concealed);
    expect(concealed).not.toContain('/art-poc/');
  });
  it.each(COLLECTION_DECK_IDS)('ships %s as a complete selectable collection with separate art, a back and a public route', id => {
    const theme = DECK_THEMES[id], entries = COLLECTION_CARDS[id];
    expect(entries.map(entry => entry.card)).toEqual(createDeck32());
    expect(new Set(entries.map(entry => entry.name)).size).toBe(32);
    expect(EDITIONS).toContain(theme);
    expect(deckAssetUrls(id)).toHaveLength(33);
    expect(parseAppearance(JSON.stringify({deck:id,table:id}))).toEqual({deck:id,table:id});
    expect(editionHref(id)).toBe(`/decks/${id}`);
    expect(galleryDeckFromPath(`/decks/${id}`)).toBe(id);
    expect(galleryDeckFromPath(`/decks/${id}/`)).toBe(id);
    expect(galleryDeckFromPath(`/decks/${id}/stickers/hearts-7.svg`)).toBeNull();
    expect(GALLERY_EDITIONS[id].cards).toBe(entries);
    expect(new Set(Object.values(theme.suits).map(s => s.ink)).size).toBe(4);
    const geometry = new Set<string>();
    for (const entry of entries) {
      expect(theme.stickerFor(entry.card)?.src).toBe(entry.stickerAsset);
      const face = renderToStaticMarkup(createElement(CardView, {card:entry.card,faceUp:true,deck:id}));
      expect(face).toContain('fill-rule="evenodd"');
      const bytes=readFileSync(root + entry.stickerAsset);
      if(entry.stickerAsset.endsWith('.webp')){
        expect(bytes.toString('ascii',0,4)).toBe('RIFF');
        expect(bytes.toString('ascii',8,12)).toBe('WEBP');
        expect(bytes.toString('ascii',12,16)).toBe('VP8X');
        expect(bytes[20]! & 0x10).toBe(0x10); // Extended WebP alpha flag.
        expect(bytes.length).toBeGreaterThan(15_000); expect(bytes.length).toBeLessThan(700_000);
        geometry.add(createHash('sha256').update(bytes).digest('hex'));
      }else{
        const svg=bytes.toString('utf8');
        expect(svg).toContain('viewBox="0 0 256 256"');
        expect(svg).not.toMatch(/<text|<script|<image|<foreignObject|https?:\/\/(?!www.w3.org)/);
        expect(svg).toContain('feMorphology');
        expect(svg).not.toMatch(/<rect[^>]*width="256"/);
        expect(bytes.length).toBeLessThan(8000);
        geometry.add(svg.replace(/#[a-f\d]{6}/gi, '#COLOR'));
      }
    }
    expect(geometry.size).toBe(32);
    expectValidBack(theme.back!);
  });
  it('renders all editions with layered indices, distinct symbols and stickers across every supported game', () => {
    for (const theme of EDITIONS) {
      expect(new Set(Object.values(theme.suits).map(s => s.paths.join(' '))).size).toBe(4);
      for (const game of GAME_IDS) for (const card of createDeck32()) {
        const html = renderToStaticMarkup(createElement(CardView, { card, faceUp: true, deck: theme.id, game, fx: { current: true } }));
        expect(html).toContain(`>${theme.ranks?.[card.rank]?.index ?? card.rank}</span>`);
        expect(html).toContain(theme.suits[card.suit].paths[0]);
        expect(html).toContain('class="card-base"');
        if (theme.center === 'symbols') {
          // Symbol decks draw their own pips/court letters and keep the role hints.
          expect(html).toContain(`data-deck="${theme.id}"`); expect(html).toContain('card-center');
          expect(html).not.toContain('data-layer="sticker"');
          continue;
        }
        expect(html).toContain(theme.stickerFor(card)!.src);
        expect(html).toContain('data-layer="sticker"');
        expect(html).toContain('data-layer="card-effect"');
        expect(stickerFor(game, card, theme.id)).toEqual(theme.stickerFor(card));
      }
    }
  });
  it('renders exactly the same back for every concealed identity, including known cards flipping down', () => {
    expect(new Set(EDITIONS.map(t => t.back)).size).toBe(EDITIONS.length);
    for (const theme of EDITIONS) {
      const expected = renderToStaticMarkup(createElement(CardView, { card: null, faceUp: false, deck: theme.id }));
      expect(expected).toContain(theme.back);
      expect(expected).not.toContain('card-front');
      expect(expected).not.toContain('/stickers/');
      for (const card of createDeck32()) expect(renderToStaticMarkup(createElement(CardView, { card, faceUp: false, deck: theme.id }))).toBe(expected);
      expectValidBack(theme.back!);
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
  it('ships Mariášky as German suits over the unchanged engine, with readable indices and bounded linocuts', () => {
    const theme = DECK_THEMES.mariasky;
    expect(MARIASKY_CARDS.map(a => a.card)).toEqual(createDeck32());
    expect(new Set(MARIASKY_CARDS.map(a => a.name)).size).toBe(32);
    expect(Object.values(theme.suits).map(s => s.name)).toEqual(['Srdce', 'Kule', 'Žaludy', 'Listy']);
    expect(['7', '8', '9', '10', 'J', 'Q', 'K', 'A'].map(r => rankLabel(r as never, 'mariasky'))).toEqual(['VII', 'VIII', 'IX', 'X', 'Sp', 'Sv', 'K', 'E']);
    expect(rankLabel('Q', 'stormpunk')).toBe('Q');
    expect(cardText({ id: 'hearts-Q', suit: 'hearts', rank: 'Q' }, 'mariasky')).toBe('Sv srdce');
    let total = 0;
    for (const art of MARIASKY_CARDS) {
      const file = root + art.stickerAsset, svg = readFileSync(file, 'utf8');
      expect(svg).toContain('viewBox="0 0 256 256"'); expect(svg).toContain('feMorphology');
      expect(svg).not.toMatch(/<text|<script|<image|<foreignObject|https?:\/\/(?!www.w3.org)/);
      const bytes = statSync(file).size; expect(bytes).toBeLessThan(7000); total += bytes;
    }
    expect(total).toBeLessThan(120_000);
    // Kule and žaludy must not collapse into one warm tone: keep them far apart in lightness.
    const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
    expect(lum(theme.suits.diamonds.color) - lum(theme.suits.clubs.color)).toBeGreaterThan(80);
  });
  it('ships Strašidla as four folk worlds with distinct glyphs and bounded creature art', () => {
    const theme = DECK_THEMES.strasidla;
    expect(STRASIDLA_CARDS.map(a => a.card)).toEqual(createDeck32());
    expect(new Set(STRASIDLA_CARDS.map(a => a.name)).size).toBe(32);
    expect(Object.values(theme.suits).map(s => s.name)).toEqual(['Oheň', 'Noc', 'Les', 'Voda']);
    expect(new Set(Object.values(theme.suits).map(s => s.color)).size).toBe(4);
    let total = 0;
    for (const art of STRASIDLA_CARDS) {
      const file = root + art.stickerAsset, svg = readFileSync(file, 'utf8');
      expect(svg).toContain('viewBox="0 0 256 256"'); expect(svg).toContain('feMorphology');
      expect(svg).not.toMatch(/<text|<script|<image|<foreignObject|https?:\/\/(?!www.w3.org)/);
      const bytes = statSync(file).size; expect(bytes).toBeLessThan(7000); total += bytes;
    }
    expect(total).toBeLessThan(120_000);
    expectValidBack(theme.back!);
  });
  it('keeps Kontrast readable: AA contrast on white, a pattern per suit and role hints on the card', () => {
    const theme = DECK_THEMES.kontrast;
    const lum = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((s, c, i) => s + c * [.2126, .7152, .0722][i]!, 0);
    for (const suit of Object.values(theme.suits)) expect(1.05 / (lum(suit.ink) + .05)).toBeGreaterThanOrEqual(4.5);
    // Diamonds and clubs carry cut-out patterns, so the four glyphs differ from Klasika and each other.
    expect(theme.suits.diamonds.paths.join()).not.toBe(DECK_THEMES.classic.suits.diamonds.paths.join());
    expect(theme.suits.clubs.paths.join()).not.toBe(DECK_THEMES.classic.suits.clubs.paths.join());
    const seven = renderToStaticMarkup(createElement(CardView, { card: { id: 'hearts-7', suit: 'hearts', rank: '7' }, faceUp: true, deck: 'kontrast', game: 'prsi' }));
    expect(seven).toContain('>+2<'); expect(seven).toContain('data-deck="kontrast"');
    const ace = renderToStaticMarkup(createElement(CardView, { card: { id: 'spades-A', suit: 'spades', rank: 'A' }, faceUp: true, deck: 'kontrast', game: 'sedma' }));
    expect(ace).toContain('10 bodů');
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
  it.each(GAME_IDS)('finishes %s identically while switching appearance at every turn', (game) => {
    function run(switching: boolean) {
      vi.stubGlobal('localStorage', {setItem() {}});
      const players = Array.from({length: Math.max(2, GAME_INFO[game].players[0]!)}, (_, i) => String.fromCharCode(97+i));
      const rng = mulberry32(71); let state: GameState = createGameRound(game, players, 0, rng).state;
      const events: unknown[] = [];
      for (let turn = 0; turn < 2000 && state.phase !== 'finished'; turn++) {
        const before = JSON.stringify(state), view = gameViewFor(state, 'a');
        if (switching) setAppearance({deck: EDITIONS[turn % EDITIONS.length]!.id, table: Object.values(TABLE_THEMES)[turn % Object.keys(TABLE_THEMES).length]!.id});
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
