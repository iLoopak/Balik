import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomView } from '@balik/shared';
import { getLastStateMessage, onStateMessage, type StateMessage } from '../net/client';
import { cuesFor, emptyDisplay, reconcile, type CueStep, type Display, type FxItem } from './display';
import { effectLifetime } from '../effects/effectPresets';

/**
 * Turns server messages into a paced sequence of display changes.
 *
 * - Events are deduplicated by `seq`; a gap or a `reset` message snaps to the snapshot
 *   without replaying anything (reconnect, missed messages).
 * - Rules never wait for animations: the server state is already final, the queue only
 *   decides *when* the display catches up. When it drains, the display is reconciled with
 *   the latest snapshot, so a glitch can never persist.
 * - A backlog speeds playback up instead of letting the table lag behind.
 * - Ephemeral effects carry their own TTL and are cleared on reset, so nothing can hang.
 * - A hidden tab never queues animations; it snaps to the snapshot instead.
 */
export function useDirector(initialRoom: RoomView, opts: { reducedMotion: boolean; lite: boolean }) {
  const me = initialRoom.you;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const r = useRef({
    display: emptyDisplay(me),
    target: initialRoom,
    lastSeq: initialRoom.seq,
    queue: [] as CueStep[],
    running: false,
    gen: 0,
    wakers: new Set<() => void>(),
    timers: new Set<number>(),
    fxId: 0,
  });
  const [display, setDisplay] = useState<Display>(r.current.display);
  const [fx, setFx] = useState<FxItem[]>([]);
  const [idle, setIdle] = useState(true);
  const [speed, setSpeed] = useState(1);

  const commit = useCallback((d: Display) => {
    r.current.display = d;
    setDisplay(d);
  }, []);

  const timeScale = useCallback(() => {
    const backlog = r.current.queue.length;
    let s = optsRef.current.reducedMotion ? 0.55 : optsRef.current.lite ? 0.8 : 1;
    if (backlog > 14) s *= 0.35;
    else if (backlog > 7) s *= 0.6;
    return s;
  }, []);

  const sleep = useCallback((ms: number) => {
    const state = r.current;
    return new Promise<void>((resolve) => {
      const wake = () => {
        window.clearTimeout(id);
        state.timers.delete(id);
        state.wakers.delete(wake);
        resolve();
      };
      const id = window.setTimeout(wake, ms);
      state.timers.add(id);
      state.wakers.add(wake);
    });
  }, []);

  const addFx = useCallback((specs: NonNullable<CueStep['fx']>, scale: number) => {
    const state = r.current;
    const items = specs.map((s) => ({ ...s, id: ++state.fxId }) as FxItem);
    setFx((prev) => {
      // Only one action label at a time — the newest replaces the old one.
      const hasLabel = items.some((i) => i.kind === 'label');
      return [...(hasLabel ? prev.filter((p) => p.kind !== 'label') : prev), ...items];
    });
    for (const item of items) {
      const delay = item.kind === 'impact' ? item.delay * 1000 : 0;
      const id = window.setTimeout(
        () => {
          state.timers.delete(id);
          setFx((prev) => prev.filter((p) => p.id !== item.id));
        },
        (item.ttl + delay) * Math.max(scale, 0.5),
      );
      state.timers.add(id);
    }
  }, []);

  const run = useCallback(async () => {
    const state = r.current;
    if (state.running) return;
    state.running = true;
    setIdle(false);
    const gen = state.gen;
    while (state.queue.length) {
      const step = state.queue.shift()!;
      const scale = timeScale();
      setSpeed(scale);
      const before = state.display;
      if (step.apply) commit(step.apply(before));
      const effects = step.effects?.(before, state.display) ?? [];
      const specs: NonNullable<CueStep['fx']> = [
        ...(step.fx ?? []),
        ...effects.map((event) => ({ kind: 'effect' as const, event, ttl: effectLifetime(event), scale })),
      ];
      if (specs.length) addFx(specs, scale);
      const wait = typeof step.wait === 'function' ? step.wait(state.display) : step.wait;
      if (wait > 0) await sleep(wait * scale);
      if (gen !== state.gen) return;
    }
    commit(reconcile(state.display, state.target.game, me));
    state.running = false;
    setSpeed(1);
    setIdle(true);
  }, [addFx, commit, me, sleep, timeScale]);

  const hardReset = useCallback(
    (room: RoomView) => {
      const state = r.current;
      state.gen++;
      state.queue = [];
      state.running = false;
      for (const t of state.timers) window.clearTimeout(t);
      state.timers.clear();
      const wakers = [...state.wakers];
      state.wakers.clear();
      wakers.forEach((w) => w());
      state.target = room;
      state.lastSeq = room.seq;
      setFx([]);
      setSpeed(1);
      setIdle(true);
      commit(reconcile(state.display, room.game, me));
    },
    [commit, me],
  );

  const receive = useCallback(
    (msg: StateMessage) => {
      const state = r.current;
      if (msg.room.you !== me) return;
      // A hidden tab can't run animations; just track the truth and show it on return.
      if (msg.reset || document.hidden) return hardReset(msg.room);
      const fresh = msg.events.filter((e) => e.seq > state.lastSeq);
      if (fresh.length && fresh[0]!.seq !== state.lastSeq + 1) return hardReset(msg.room);
      if (!fresh.length && msg.room.seq > state.lastSeq) return hardReset(msg.room);
      state.target = msg.room;
      if (!fresh.length) {
        if (!state.running) commit(reconcile(state.display, msg.room.game, me));
        return;
      }
      const names = new Map(msg.room.players.map((p) => [p.id, p.name]));
      const ctx = {
        me,
        order: msg.room.game?.players.map((p) => p.id) ?? [],
        name: (id: string) => names.get(id) ?? 'Hráč',
      };
      for (const ev of fresh) state.queue.push(...cuesFor(ev, ctx));
      state.lastSeq = fresh.at(-1)!.seq;
      void run();
    },
    [commit, hardReset, me, run],
  );

  useEffect(() => {
    const state = r.current;
    // If the message that mounted the table started a round, animate it from an empty table.
    const last = getLastStateMessage();
    const first = last?.events[0];
    if (last && !last.reset && first?.type === 'roundStarted' && last.room.seq === initialRoom.seq) {
      state.lastSeq = first.seq - 1;
      receive(last);
    } else {
      hardReset(initialRoom);
    }
    const off = onStateMessage(receive);
    // Clear transient FX on both edges, including effects that outlive an already-idle queue.
    // Returning to the tab always shows the latest snapshot without a stale burst or badge.
    const onVisible = () => {
      hardReset(state.target);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      off();
      document.removeEventListener('visibilitychange', onVisible);
      state.gen++;
      for (const t of state.timers) window.clearTimeout(t);
      state.timers.clear();
      state.wakers.clear();
      state.queue = [];
      state.running = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once per room/seat
  }, []);

  return { display, fx, idle, speed, target: r.current.target };
}
