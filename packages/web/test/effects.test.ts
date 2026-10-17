import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { SeqEvent } from '@balik/shared';
import { CardView } from '../src/cards/Card';
import { cuesFor, type CueStep, type Display } from '../src/table/display';
import { effectsForGameEvent, type EffectEvent } from '../src/effects/effectEvents';
import { EFFECT_PRESETS, effectLifetime } from '../src/effects/effectPresets';
import { effectQuality, particleBudget } from '../src/effects/effectTokens';
import { previewCard, previewDisplay, previewScenario } from '../src/effects/previewScenarios';

const ctx = { me: 'me', order: ['me', 'ada', 'max'], name: (id: string) => id === 'ada' ? 'Ada' : 'Max' };
function replay(initial: Display, steps: CueStep[]) {
  let display = initial;
  const effects: EffectEvent[] = [];
  for (const step of steps) {
    const before = display;
    display = step.apply?.(before) ?? before;
    effects.push(...(step.effects?.(before, display) ?? []));
  }
  return { display, effects };
}

describe('event-driven card effects', () => {
  it('keeps the played card identity and owns its flight in the existing display layer', () => {
    const scene = previewScenario('play', 'hearts');
    const card = scene.initial.hands.me!.find((e) => e.key === 'hearts-8')!;
    const { display, effects } = replay(scene.initial, scene.steps);
    const top = display.discard.at(-1)!;
    expect(top.key).toBe(card.key);
    expect(top.spawn).toBeNull(); // existing DOM entity moves; a ghost is not substituted
    expect(top.move).toBe('play');
    expect(display.hands.me).toHaveLength(3);
    expect(effects.map((e) => e.kind)).toEqual(['play']);
    expect(EFFECT_PRESETS.play.delay).toBe(.46); // landing, rather than the start of the flight
  });

  it('attributes a +2 chain to each actual sender and recipient using display order', () => {
    const scene = previewScenario('chain', 'hearts');
    const { display, effects } = replay(scene.initial, scene.steps);
    const penalties = effects.filter((e) => e.kind === 'penalty');
    expect(penalties.map((e) => e.count)).toEqual([2, 4, 6]);
    expect(penalties.map((e) => e.sourcePlayerId)).toEqual(['me', 'ada', 'max']);
    expect(penalties.map((e) => e.targetPlayerId)).toEqual(['ada', 'max', 'me']);
    expect(penalties[2]!.label).toBe('Max → Ty · +6');
    expect(display.pendingDraw).toBe(0);
    expect(display.hands.me).toHaveLength(9);
  });

  it('does not expose hidden card identities in opponent draw feedback', () => {
    const initial = previewDisplay('clubs');
    const event: SeqEvent = { type: 'cardsDrawn', seq: 1, playerId: 'ada', count: 2, reason: 'normal' };
    const { display, effects } = replay(initial, cuesFor(event, ctx));
    expect(display.hands.ada).toHaveLength(6);
    expect(display.hands.ada!.every((e) => e.card === null)).toBe(true);
    expect(effects).toEqual([{ kind: 'draw', suit: 'clubs', targetPlayerId: 'ada', targetName: 'Ada', count: 2, label: 'Ada · +2 do ruky' }]);
  });

  it('uses the newly selected suit and identifies the skipped player separately from the ace sender', () => {
    const suitScene = previewScenario('suit', 'hearts');
    const suitResult = replay(suitScene.initial, suitScene.steps);
    expect(suitResult.display.activeSuit).toBe('diamonds');
    expect(suitResult.effects.find((e) => e.kind === 'suit')?.label).toBe('Hraje se Pohyb');
    const skipScene = previewScenario('skip', 'spades');
    const skipResult = replay(skipScene.initial, skipScene.steps);
    expect(skipResult.effects.map((e) => e.kind)).toEqual(['play', 'pause', 'skip']);
    expect(skipResult.effects.at(-1)?.targetPlayerId).toBe('ada');
    expect(skipResult.effects.at(-1)?.sourcePlayerId).toBe('me');
    expect(skipResult.display.currentPlayerId).toBe('max');
  });

  it('announces entry into one-card danger, never a win or a draw', () => {
    const danger = previewScenario('danger', 'clubs');
    expect(replay(danger.initial, danger.steps).effects.map((e) => e.kind)).toEqual(['play', 'danger']);
    const win = previewScenario('win', 'clubs');
    const result = replay(win.initial, win.steps);
    expect(result.effects.map((e) => e.kind)).toEqual(['play', 'win']);
    expect(result.display.winnerId).toBe('me');
    expect(result.display.phase).toBe('finished');
    const emptyDraw: SeqEvent = { type: 'cardsDrawn', seq: 2, playerId: 'me', reason: 'normal', count: 0, cards: [] };
    expect(effectsForGameEvent(emptyDraw, danger.initial, danger.initial, ctx)).toEqual([]);
  });

  it('keeps reverse as a preview-only extension without modifying Prší order', () => {
    const scene = previewScenario('reverse', 'diamonds');
    const result = replay(scene.initial, scene.steps);
    expect(result.display.order).toEqual(scene.initial.order);
    expect(result.display).toBe(scene.initial);
    expect(result.effects[0]?.kind).toBe('reverse');
    expect(EFFECT_PRESETS.reverse.duration).toBeGreaterThanOrEqual(.4);
    expect(EFFECT_PRESETS.reverse.duration).toBeLessThanOrEqual(.8);
  });

  it('gives every preview finite effect lifetimes and lowers particle budgets by device capability', () => {
    for (const action of ['play', 'draw', 'suit', 'skip', 'reverse', 'penalty', 'danger', 'win', 'chain'] as const) {
      const scene = previewScenario(action, 'spades');
      for (const effect of replay(scene.initial, scene.steps).effects) {
        expect(effectLifetime(effect)).toBeGreaterThan(0);
        expect(effectLifetime(effect)).toBeLessThan(2000);
      }
    }
    expect(particleBudget(effectQuality(true, false, false))).toBe(0);
    expect(particleBudget(effectQuality(false, true, false))).toBeLessThan(particleBudget('mobile'));
    expect(particleBudget('mobile')).toBeLessThan(particleBudget('full'));
  });

  it('renders the current-card effect independently from the base, indices and sticker image', () => {
    const html = renderToStaticMarkup(createElement(CardView, { card: previewCard('hearts', 'J'), faceUp: true, deck: 'stormpunk', fx: { current: true } }));
    expect(html).toContain('class="card-base"');
    expect(html).toContain('data-layer="sticker"');
    expect(html).toContain('data-layer="card-effect"');
    expect(html).toContain('/decks/stormpunk/stickers/vyhen/j.webp');
    expect(html).not.toContain('background-image');
  });
});
