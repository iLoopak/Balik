import { useEffect, useRef, useState } from 'react';
import type { RoomView, SedmaClientEvent } from '@balik/shared';
import { getLastStateMessage, onStateMessage, type StateMessage } from '../net/client';
import { brandAudio } from '../brand/audio';
import { feedbackGate } from '../brand/feedback';
import { reconcileSedma, sedmaSteps, type SedmaDisplay, type SedmaStep } from './display';

/** Ordered semantic cues. Resets cancel timers/audio; no effect is replayed after reconnect. */
export function useSedmaDirector(room: RoomView<'sedma'>, quiet: boolean) {
  const [display, setDisplay] = useState(() => reconcileSedma(room.game!, room.you));
  const [idle, setIdle] = useState(true);
  const state = useRef({ display, target: room, seq: room.seq, generation: 0, running: false,
    queue: [] as { step: SedmaStep; key: string }[], timer: 0, wake: (() => {}) as () => void });
  const quietRef = useRef(quiet); quietRef.current = quiet;
  useEffect(() => {
    const s = state.current;
    const commit = (next: SedmaDisplay) => { s.display = next; setDisplay(next); };
    const reset = (target: RoomView<'sedma'>) => {
      s.generation++; clearTimeout(s.timer); s.wake(); s.queue = []; s.running = false;
      brandAudio.cancel(); s.target = target; s.seq = target.seq;
      if (target.game) commit(reconcileSedma(target.game, target.you, s.display)); setIdle(true);
    };
    const run = async () => {
      if (s.running) return;
      s.running = true; setIdle(false); const generation = s.generation;
      while (s.queue.length) {
        const { step, key } = s.queue.shift()!;
        const scale = quietRef.current ? .15 : s.queue.length > 14 ? .35 : s.queue.length > 7 ? .6 : 1;
        commit(step.apply(s.display));
        if (step.sound && !document.hidden) feedbackGate.once(key, () => brandAudio.play(step.sound!));
        if (step.wait) await new Promise<void>((resolve) => { s.wake = resolve; s.timer = window.setTimeout(resolve, step.wait * scale); });
        if (generation !== s.generation) return;
      }
      if (s.target.game) commit(reconcileSedma(s.target.game, room.you, s.display));
      s.running = false; setIdle(true);
    };
    const receive = (msg: StateMessage) => {
      if (msg.room.gameId !== 'sedma' || msg.room.code !== room.code || msg.room.you !== room.you || !msg.room.game) return;
      const target = msg.room;
      if (msg.reset || document.hidden) return reset(target);
      const fresh = msg.events.filter((e) => e.seq > s.seq);
      if ((fresh.length && fresh[0]!.seq !== s.seq + 1) || (!fresh.length && target.seq > s.seq)) return reset(target);
      if (target.round !== s.target.round) brandAudio.cancel();
      s.target = target;
      if (!fresh.length) { if (!s.running) commit(reconcileSedma(target.game!, room.you, s.display)); return; }
      for (const event of fresh) sedmaSteps(event as SedmaClientEvent, room.you, target.game!).forEach((step, i) => s.queue.push({ step, key: `${room.code}:${room.you}:${target.round}:sedma:${event.seq}:${i}` }));
      s.seq = fresh.at(-1)!.seq; void run();
    };
    const last = getLastStateMessage();
    if (last?.room.code === room.code && !last.reset && last.events[0]?.type === 'sedmaStarted' && last.room.seq === room.seq) { s.seq = last.events[0].seq - 1; receive(last); }
    else reset(room);
    const off = onStateMessage(receive);
    const visibility = () => reset(s.target);
    document.addEventListener('visibilitychange', visibility);
    return () => { off(); s.generation++; clearTimeout(s.timer); s.wake(); s.queue = []; s.running = false; brandAudio.cancel(); document.removeEventListener('visibilitychange', visibility); };
  }, [room.code, room.you]);
  return { display, idle };
}
