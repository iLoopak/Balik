import { useEnvironmentSignals } from '../table/useEnvironmentSignals';
import { useEffect, useRef, useState } from 'react';
import type { RoomView, LharClientEvent } from '@balik/shared';
import { getLastStateMessage, onStateMessage, type StateMessage } from '../net/client';
import { inspectLharFrame } from './ordering';
import { brandAudio } from '../brand/audio';
import { feedbackGate } from '../brand/feedback';
import { reconcileLhar, lharSteps, type LharDisplay, type LharStep } from './display';

/** Ordered semantic cues. Resets cancel timers/audio; no effect is replayed after reconnect. */
export function useLharDirector(room: RoomView<'lhar'>, quiet: boolean) {
  const [display, setDisplay] = useState(() => reconcileLhar(room.game!, room.you));
  const [idle, setIdle] = useState(true);
  const { pulses:environment, emitEnvironment, clearEnvironment } = useEnvironmentSignals();
  const state = useRef({
    display,
    target: room,
    seq: room.seq,
    generation: 0,
    running: false,
    queue: [] as { step: LharStep; key: string }[],
    timer: 0,
    wake: (() => {}) as () => void,
  });
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  useEffect(() => {
    const s = state.current;
    const commit = (next: LharDisplay) => {
      s.display = next;
      setDisplay(next);
    };
    const reset = (target: RoomView<'lhar'>) => {
      s.generation++;
      clearTimeout(s.timer);
      s.wake();
      s.queue = [];
      s.running = false;
      brandAudio.cancel();
      clearEnvironment();
      s.target = target;
      s.seq = target.seq;
      if (target.game) commit(reconcileLhar(target.game, target.you, s.display));
      setIdle(true);
    };
    const run = async () => {
      if (s.running) return;
      s.running = true;
      setIdle(false);
      const generation = s.generation;
      while (s.queue.length) {
        const { step, key } = s.queue.shift()!;
        const scale = quietRef.current ? 0.15 : s.queue.length > 14 ? 0.35 : s.queue.length > 7 ? 0.6 : 1;
        const before = s.display, next = step.apply(before);
        commit(next);
        if (next !== before && step.environment && !document.hidden) emitEnvironment({ ...step.environment, scale });
        if (step.sound && !document.hidden) feedbackGate.once(key, () => brandAudio.play(step.sound!));
        const duration = quietRef.current ? (step.quietWait ?? step.wait * 0.15) : step.wait * scale;
        if (duration)
          await new Promise<void>((resolve) => {
            s.wake = resolve;
            s.timer = window.setTimeout(resolve, duration);
          });
        if (generation !== s.generation) return;
      }
      if (s.target.game) commit(reconcileLhar(s.target.game, room.you, s.display));
      s.running = false;
      setIdle(true);
    };
    const receive = (msg: StateMessage) => {
      if (
        msg.room.gameId !== 'lhar' ||
        msg.room.code !== room.code ||
        msg.room.you !== room.you ||
        !msg.room.game
      )
        return;
      const target = msg.room;
      const order = inspectLharFrame({round:s.target.round,seq:s.seq},target,msg.events,msg.reset);
      if (order.mode === 'ignore') return;
      if (order.mode === 'reset' || document.hidden) return reset(target);
      const fresh = order.fresh;
      if (target.round !== s.target.round) {
        reset(target);
        const start = fresh.find((e) => e.type === 'lharStarted');
        if (!start) return;
        s.seq = start.seq - 1;
      }
      s.target = target;
      if (!fresh.length) {
        if (!s.running) commit(reconcileLhar(target.game!, room.you, s.display));
        return;
      }
      for (const event of fresh)
        lharSteps(event as LharClientEvent, room.you, target.game!).forEach((step, i) =>
          s.queue.push({ step, key: `${room.code}:${room.you}:${target.round}:lhar:${event.seq}:${i}` }),
        );
      s.seq = fresh.at(-1)!.seq;
      void run();
    };
    const last = getLastStateMessage();
    if (
      last?.room.code === room.code &&
      !last.reset &&
      last.events[0]?.type === 'lharStarted' &&
      last.room.seq === room.seq
    ) {
      s.seq = last.events[0].seq - 1;
      receive(last);
    } else reset(room);
    const off = onStateMessage(receive);
    const visibility = () => reset(s.target);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      off();
      s.generation++;
      clearTimeout(s.timer);
      s.wake();
      s.queue = [];
      s.running = false;
      brandAudio.cancel();
      clearEnvironment(false);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [room.code, room.you, emitEnvironment, clearEnvironment]);
  return { display, idle, environment };
}
