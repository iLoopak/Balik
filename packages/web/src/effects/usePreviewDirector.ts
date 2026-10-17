import { useCallback, useEffect, useRef, useState } from 'react';
import type { Suit } from '@balik/shared';
import type { CueStep, FxItem } from '../table/display';
import { effectLifetime } from './effectPresets';
import { previewDisplay, previewScenario, type PreviewAction } from './previewScenarios';

/** Local-only clock for the playground. The live game continues to use useDirector. */
export function usePreviewDirector() {
  const [display, setDisplay] = useState(() => previewDisplay('hearts'));
  const [fx, setFx] = useState<FxItem[]>([]);
  const [running, setRunning] = useState(false);
  const [sceneId, setSceneId] = useState(0);
  const [speed, setSpeed] = useState(1);
  const state = useRef({ gen: 0, fxId: 0, timers: new Map<number, () => void>() });

  const cancel = useCallback(() => {
    state.current.gen++;
    for (const [id, resolve] of state.current.timers) { window.clearTimeout(id); resolve(); }
    state.current.timers.clear();
  }, []);
  const wait = useCallback((ms: number) => new Promise<void>((resolve) => {
    const id = window.setTimeout(() => { state.current.timers.delete(id); resolve(); }, ms);
    state.current.timers.set(id, resolve);
  }), []);

  const reset = useCallback((suit: Suit) => {
    cancel(); setDisplay(previewDisplay(suit)); setFx([]); setRunning(false); setSpeed(1); setSceneId((n) => n + 1);
  }, [cancel]);

  const play = useCallback(async (action: PreviewAction, suit: Suit, scale: number) => {
    cancel();
    const gen = state.current.gen;
    const scene = previewScenario(action, suit);
    let shown = scene.initial;
    setDisplay(shown); setFx([]); setRunning(true); setSceneId((n) => n + 1); setSpeed(scale);
    await wait(90);
    if (gen !== state.current.gen) return;
    for (const step of scene.steps) {
      if (gen !== state.current.gen) return;
      const before = shown;
      if (step.apply) { shown = step.apply(shown); setDisplay(shown); }
      const effects = step.effects?.(before, shown) ?? [];
      const specs: NonNullable<CueStep['fx']> = [
        ...(step.fx ?? []), ...effects.map((event) => ({ kind: 'effect' as const, event, ttl: effectLifetime(event), scale })),
      ];
      const items = specs.map((s): FxItem => ({ ...s, id: ++state.current.fxId }));
      if (items.length) setFx((prev) => [...(items.some((e) => e.kind === 'label') ? prev.filter((e) => e.kind !== 'label') : prev), ...items]);
      for (const effect of items) {
        const id = window.setTimeout(() => {
          state.current.timers.delete(id);
          if (gen === state.current.gen) setFx((prev) => prev.filter((e) => e.id !== effect.id));
        }, effect.ttl * Math.max(scale, .5));
        state.current.timers.set(id, () => {});
      }
      await wait((typeof step.wait === 'function' ? step.wait(shown) : step.wait) * scale);
    }
    if (gen === state.current.gen) { setRunning(false); setSpeed(1); }
  }, [cancel, wait]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) { cancel(); setFx([]); setRunning(false); } };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancel(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [cancel]);
  return { display, fx, running, sceneId, speed, play, reset };
}
