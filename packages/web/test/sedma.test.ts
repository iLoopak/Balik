import { describe, expect, it } from 'vitest';
import { applySedmaAction, chooseSedmaBotFromView, createDeck32, createSedmaRound, filterSedmaEventFor, mulberry32, sedmaViewFor } from '@balik/shared';
import { computeGeometry } from '../src/table/layout';
import { reconcileSedma, sedmaSteps } from '../src/sedma/display';
import { placeSedma } from '../src/sedma/layout';
import { stickerFor } from '../src/cards/skin';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { BrandResults } from '../src/brand/BrandResults';
import { CardView } from '../src/cards/Card';
const ui = { hovered: null, selected: null, pendingKey: null, playable: new Set<string>(), myTurn: false };

describe('Sedma presentation on shared card infrastructure', () => {
  it('preserves the actual moving element keys from hidden hand to trick and capture', () => {
    let state = createSedmaRound(['a', 'b', 'c', 'd'], 0, mulberry32(1)).state;
    let display = reconcileSedma(sedmaViewFor(state, 'a'), 'a');
    const keys = new Set(Object.values(display.hands).flat().map((e) => e.key));
    let captured = false;
    for (let i = 0; i < 10 && !captured; i++) {
      const id = state.players[state.currentIndex]!.id;
      const action = chooseSedmaBotFromView(sedmaViewFor(state, id), id);
      const result = applySedmaAction(state, id, action); if (!result.ok) throw new Error(result.error);
      state = result.state;
      for (const raw of result.events) for (const step of sedmaSteps(filterSedmaEventFor(raw, 'a'), 'a', sedmaViewFor(state, 'a'))) {
        const before = display; display = step.apply(display);
        for (const { entity } of display.trick) expect(keys.has(entity.key)).toBe(true);
        if (display.outgoing.length) {
          captured = true; expect(display.captureTo).toBe(state.lastTrick!.winnerId);
          expect(display.outgoing.map((e) => e.key)).toEqual(before.trick.map((p) => p.entity.key));
        }
      }
    }
    expect(captured).toBe(true);
    const reset = reconcileSedma(sedmaViewFor(state, 'a'), 'a', display);
    expect(reset.outgoing).toEqual([]); expect(reset.resolution).toBeNull();
  });
  it('keeps four own cards, complete trick and draw targets inside desktop and mobile viewports', () => {
    const state = createSedmaRound(['a','b','c','d'], 0, mulberry32(3)).state;
    const view = sedmaViewFor(state, 'a');
    view.trick = state.players.map((p) => ({ playerId: p.id, card: p.hand[0]! }));
    // Layout fixture: cards in the trick are removed from the corresponding displayed hand.
    view.myHand = view.myHand!.slice(1); view.players = view.players.map((p) => ({ ...p, handCount: 3 }));
    const display = reconcileSedma(view, 'a');
    for (const [w,h] of [[320,440],[390,700],[844,280],[1280,700],[1920,900]]) {
      const geo = computeGeometry(w!,h!,view.players.map((p) => p.id),'a',3);
      const cards = placeSedma(display,geo,'a',ui);
      expect(new Set(cards.map((p) => p.entity.key)).size).toBe(cards.length);
      for (const card of cards.filter((p) => p.zone === 'mine' || p.zone === 'discard')) {
        const {x,y,scale}=card.place;
        expect(x-geo.cardW*scale/2).toBeGreaterThanOrEqual(0);
        expect(x+geo.cardW*scale/2).toBeLessThanOrEqual(w!);
        expect(y-geo.cardH*scale/2).toBeGreaterThanOrEqual(0);
        expect(y+geo.cardH*scale/2).toBeLessThanOrEqual(h!);
      }
    }
  });
  it('uses the shared results shell for team wins and a real 40:40 draw', () => {
    const state = createSedmaRound(['a','b','c','d'],0,mulberry32(3),0).state;
    state.phase = 'finished'; state.scores = [40,40]; state.result = {scores:[40,40],winnerTeam:null,winnerIds:[],reason:'points'};
    const room = { code:'ABCD', gameId:'sedma' as const, you:'a', hostId:'a', status:'finished' as const, round:1,seq:100,
      players:state.players.map((p) => ({id:p.id,name:p.id,connected:true,bot:false,wins:0})),game:sedmaViewFor(state,'a') };
    const html = renderToStaticMarkup(createElement(BrandResults, {room,winnerId:null,pending:false,reduced:true,onRematch:()=>{},onLobby:()=>{},onLeave:()=>{}}));
    expect(html).toContain('Dělíte se o balík.'); expect(html).toContain('40 : 40'); expect(html).toContain('Odveta');
    expect(html).not.toContain('class="is-winner"');
  });
  it('uses every existing sticker and classic layered card with game-specific hints', () => {
    for (const card of createDeck32()) expect(stickerFor('sedma',card,'stormpunk')).toEqual(stickerFor('prsi',card,'stormpunk'));
    const card = createDeck32().find((c) => c.rank === 'A')!;
    const sedma = renderToStaticMarkup(createElement(CardView,{card,faceUp:true,deck:'classic',game:'sedma'}));
    const prsi = renderToStaticMarkup(createElement(CardView,{card,faceUp:true,deck:'classic',game:'prsi'}));
    expect(sedma).toContain('10 bodů'); expect(sedma).not.toContain('>stop<'); expect(prsi).toContain('>stop<');
  });
});
