import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyLharAction,
  applySedmaAction,
  chooseSedmaBotFromView,
  createLharRound,
  createSedmaRound,
  filterLharEventFor,
  filterSedmaEventFor,
  lharViewFor,
  mulberry32,
  sedmaViewFor,
  type GameId,
} from '@balik/shared';
import { GameTableTheme, CONSOLE_FRAMES } from '../src/table/GameTableTheme';
import { ConsoleReactions } from '../src/table/ConsoleReactions';
import {
  CONSOLE_LABELS,
  ENVIRONMENT_PULSE_MS,
  EnvironmentSignalQueue,
  MAX_ENVIRONMENT_PULSES,
  consolePocket,
  environmentFromEffects,
  environmentPlayerAnchor,
  environmentRoute,
  type EnvironmentPulse,
  type EnvironmentSignal,
} from '../src/table/environment';
import { computeGeometry } from '../src/table/layout';
import { TABLE_THEMES } from '../src/themes/registry';
import { useAppearance } from '../src/themes/preferences';
import { reconcileSedma, sedmaSteps } from '../src/sedma/display';
import { lharSteps, reconcileLhar } from '../src/lhar/display';
import type { EffectInstance } from '../src/effects/effectEvents';
afterEach(() => {
  vi.useRealTimers();
  useAppearance.setState({ deck: 'stormpunk', table: 'stormpunk' });
});
describe('BALÍK dealer apparatus', () => {
  it('keeps house identity independent of deck and draws actual game-specific receiving slots', () => {
    const geo = computeGeometry(1440, 900, ['me', 'ada'], 'me', 4);
    const render = (game: GameId = 'prsi') =>
      renderToStaticMarkup(
        createElement(GameTableTheme, {
          geo,
          suit: 'hearts',
          reduced: true,
          lite: false,
          myTurn: true,
          game,
        }),
      );
    const before = render();
    for (const deck of ['classic', 'retro-arcade', 'stormpunk'] as const) {
      useAppearance.setState({ deck });
      expect(render()).toBe(before);
    }
    expect(before).toContain('data-environment="dealer-console"');
    expect(before).toContain('KARETNÍ STROJ');
    expect(before).toContain('data-console-slot="draw"');
    expect(before).toContain('ODEHRÁNO');
    expect(render('sedma')).toContain('ŠTYCH');
    const lhar = render('lhar');
    expect(lhar).toContain('TVRZENÍ');
    expect(lhar).not.toContain('data-console-slot="draw"');
    expect(lhar).not.toContain('DOBÍRÁNÍ');
    expect(before).not.toContain('/decks/');
    expect(before).not.toContain('role="button"');
    for (const path of Object.values(CONSOLE_FRAMES).flat()) expect(path).not.toMatch(/[aAcCqQ]/); // apparatus frame, no oval mat
    expect(CONSOLE_LABELS.lhar.input).toBeNull();
  });
  it('renders both materials and profiles with bounded reactions on phone, landscape and desktop', () => {
    const pulses: EnvironmentPulse[] = Array.from({ length: 12 }, (_, id) => ({
      id,
      kind: 'play',
      sourcePlayerId: 'ada',
    }));
    for (const [w, h] of [
      [320, 440],
      [390, 700],
      [844, 280],
      [1440, 900],
    ])
      for (const theme of Object.values(TABLE_THEMES))
        for (const colorMode of ['light', 'dark'] as const) {
          const geo = computeGeometry(w!, h!, ['me', 'ada', 'max', 'eli'], 'me', 7);
          const html = renderToStaticMarkup(
            createElement(GameTableTheme, {
              geo,
              suit: 'diamonds',
              reduced: true,
              lite: false,
              myTurn: true,
              theme: theme.id,
              colorMode,
              pulses,
            }),
          );
          expect(html).toContain(`data-color-mode="${colorMode}"`);
          expect(html).toContain('data-console-motion="static"');
          expect(html.match(/data-console-reaction=/g)).toHaveLength(1);
          expect(html).not.toMatch(/NaN|Infinity|undefined/);
          expect(html).toContain(colorMode === 'light' ? theme.light.background : theme.background);
          const normal = renderToStaticMarkup(
            createElement(ConsoleReactions, { geo, pulses, game: 'prsi', quiet: false, you: 'me' }),
          );
          expect(normal.match(/data-console-reaction=/g)).toHaveLength(geo.compact ? 2 : 4);
        }
  });
  it('uses actual deck, centre and player anchors, including Lhář without a stock', () => {
    const geo = computeGeometry(390, 700, ['a', 'b', 'c'], 'a', 7);
    const from = (p: { x: number; y: number }) => `M${p.x} ${p.y} Q`;
    expect(
      environmentRoute(geo, { kind: 'play', sourcePlayerId: 'b' }, 'prsi', 'a')?.startsWith(
        from(geo.seats.b!),
      ),
    ).toBe(true);
    expect(
      environmentRoute(geo, { kind: 'draw', targetPlayerId: 'a' }, 'prsi', 'a')?.startsWith(from(geo.deck)),
    ).toBe(true);
    expect(
      environmentRoute(geo, { kind: 'deal', targetPlayerId: 'b' }, 'lhar', 'a')?.startsWith(
        from(geo.discard),
      ),
    ).toBe(true);
    expect(
      environmentRoute(geo, { kind: 'collect', targetPlayerId: 'a' }, 'sedma', 'a')?.startsWith(
        from(geo.discard),
      ),
    ).toBe(true);
    expect(environmentPlayerAnchor(geo, 'left-seat', 'a')).toEqual(geo.discard);
    expect(environmentRoute(geo, { kind: 'suit' }, 'prsi')).toBeNull();
    const sedmaGeo = {
      ...geo,
      discard: { x: geo.w / 2, y: geo.discard.y },
      deck: { x: 28, y: geo.controlY - 30 },
      deckW: geo.cardW * 0.35,
      deckH: geo.cardH * 0.35,
    };
    const stock = consolePocket(sedmaGeo, 'sedma', 'draw'),
      trick = consolePocket(sedmaGeo, 'sedma', 'play');
    expect(stock.width).toBeCloseTo(geo.cardW * 0.35 * 1.36);
    expect(stock.x - stock.width / 2).toBeGreaterThanOrEqual(0);
    expect(trick.width).toBeGreaterThan(consolePocket(geo, 'prsi', 'play').width);
    expect(trick.width).toBeLessThanOrEqual(geo.w - 12);
  });
  it('bounds lifetime and timers, cancels reset/unmount effects and can start a fresh generation', () => {
    vi.useFakeTimers();
    const changed = vi.fn(),
      queue = new EnvironmentSignalQueue(changed);
    for (let i = 0; i < 20; i++)
      queue.emit({
        kind: 'play',
        sourcePlayerId: 'a',
        cardId: 'secret-card',
        truthful: false,
      } as EnvironmentSignal);
    const first = changed.mock.calls.at(-1)![0] as EnvironmentPulse[];
    expect(first).toHaveLength(MAX_ENVIRONMENT_PULSES);
    expect(vi.getTimerCount()).toBe(MAX_ENVIRONMENT_PULSES);
    expect(JSON.stringify(first)).not.toMatch(/secret-card|truthful|cardId/);
    queue.clear();
    expect(changed.mock.calls.at(-1)![0]).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
    queue.emit({ kind: 'draw', scale: 0.3, targetPlayerId: 'a' });
    const newer = changed.mock.calls.at(-1)![0][0];
    expect(newer.id).toBeGreaterThan(first.at(-1)!.id);
    vi.advanceTimersByTime(449);
    expect(changed.mock.calls.at(-1)![0]).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(changed.mock.calls.at(-1)![0]).toEqual([]);
    queue.emit({ kind: 'win' });
    const count = changed.mock.calls.length;
    queue.clear(false);
    vi.advanceTimersByTime(ENVIRONMENT_PULSE_MS * 2);
    expect(changed).toHaveBeenCalledTimes(count);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('adapts Prší FX by semantic event, without copying card identity or hidden metadata', () => {
    const items: EffectInstance[] = (
      ['play', 'draw', 'suit', 'skip', 'penalty', 'win', 'pause', 'danger'] as const
    ).map((kind, id) => ({
      kind: 'effect',
      id,
      event: {
        kind,
        cardId: 'hearts-7',
        count: 7,
        suit: 'hearts',
        sourceName: 'Ada',
        sourcePlayerId: 'a',
        targetPlayerId: 'b',
        label: 'private-looking label',
      },
      scale: 0.5,
      ttl: 900,
    }));
    const pulses = environmentFromEffects(items);
    expect(pulses.map((p) => p.kind)).toEqual(['suit', 'skip', 'penalty', 'win']);
    expect(pulses.every((p) => p.scale === 0.5)).toBe(true);
    expect(JSON.stringify(pulses)).not.toMatch(/hearts|cardId|count|label|sourceName/);
  });
  it('emits Sedma play, stock and capture signals at the existing moving-card cues', () => {
    let state = createSedmaRound(['a', 'b'], 0, mulberry32(1)).state;
    let display = reconcileSedma(sedmaViewFor(state, 'a'), 'a');
    const signals: EnvironmentSignal[] = [];
    for (let i = 0; i < 40 && !signals.some((s) => s.kind === 'draw'); i++) {
      const id = state.players[state.currentIndex]!.id,
        result = applySedmaAction(state, id, chooseSedmaBotFromView(sedmaViewFor(state, id), id));
      if (!result.ok) throw Error(result.error);
      state = result.state;
      for (const raw of result.events)
        for (const step of sedmaSteps(filterSedmaEventFor(raw, 'a'), 'a', sedmaViewFor(state, 'a'))) {
          const next = step.apply(display);
          if (next !== display && step.environment) signals.push(step.environment);
          display = next;
        }
    }
    expect(new Set(signals.map((s) => s.kind))).toEqual(new Set(['play', 'collect', 'draw']));
    expect(signals.filter((s) => s.kind === 'collect').every((s) => s.targetPlayerId)).toBe(true);
  });
  it('does not expose Lhář card identity/truth in the machine and only signals reveal at the reveal cue', () => {
    let state = createLharRound(['a', 'b'], 0, mulberry32(2)).state;
    let display = reconcileLhar(lharViewFor(state, 'b'), 'b');
    const hidden = state.players[0]!.hand[0]!.id;
    const played = applyLharAction(state, 'a', { type: 'lharPlay', cardIds: [hidden], declaredRank: '7' });
    if (!played.ok) throw Error(played.error);
    state = played.state;
    const signals: EnvironmentSignal[] = [];
    for (const raw of played.events)
      for (const step of lharSteps(filterLharEventFor(raw, 'b'), 'b', lharViewFor(state, 'b'))) {
        const next = step.apply(display);
        if (next !== display && step.environment) signals.push(step.environment);
        display = next;
      }
    expect(signals).toEqual([{ kind: 'play', sourcePlayerId: 'a' }]);
    expect(display.pile.every((p) => p.entity.card === null)).toBe(true);
    const claim = state.lastClaim!.id,
      resolved = applyLharAction(state, 'b', { type: 'lharChallenge', claimId: claim });
    if (!resolved.ok) throw Error(resolved.error);
    state = resolved.state;
    for (const raw of resolved.events)
      for (const step of lharSteps(filterLharEventFor(raw, 'b'), 'b', lharViewFor(state, 'b'))) {
        const next = step.apply(display);
        if (next !== display && step.environment) {
          signals.push(step.environment);
          if (step.environment.kind === 'reveal') expect(next.beat).toBe('reveal');
        }
        display = next;
      }
    expect(signals.map((s) => s.kind)).toEqual(['play', 'challenge', 'reveal', 'collect']);
    expect(JSON.stringify(signals)).not.toMatch(/truthful|myCards|cardId|suit|rank/);
    const reset = reconcileLhar(lharViewFor(state, 'b'), 'b');
    expect(reset.beat).toBe('quiet');
    expect(reset.resolution).toBeNull();
  });
});

describe('console wiring', () => {
  it('cables each seat into the console, marks only the active lane and reads out the stock', () => {
    for (const [w, h] of [[390, 844], [1440, 900], [844, 390]] as const) {
      const geo = computeGeometry(w, h, ['me', 'ada', 'max', 'iva'], 'me', 6);
      const html = renderToStaticMarkup(createElement(GameTableTheme, { geo, suit: 'hearts', reduced: true, lite: false, myTurn: false, game: 'prsi', drawCount: 13, active: 'max' }));
      const lanes = [...html.matchAll(/data-console-lane="([^"]+)"/g)].map(m => m[1]!);
      for (const id of lanes) expect(['ada', 'max', 'iva', 'me']).toContain(id);
      expect(html.match(/class="console-lane is-live"/g)?.length ?? 0).toBe(lanes.includes('max') ? 1 : 0);
      expect(html).toContain('data-console-gauge="4"');
      expect(html).toContain('class="console-slot-count">13<');
      expect(html).not.toContain('NaN');
    }
    const geo = computeGeometry(1440, 900, ['me', 'ada'], 'me', 4);
    const lhar = renderToStaticMarkup(createElement(GameTableTheme, { geo, suit: null, reduced: true, lite: false, myTurn: true, game: 'lhar' }));
    expect(lhar).not.toContain('data-console-gauge');
    expect(lhar).toContain('data-console-lane="me"');
  });
});
