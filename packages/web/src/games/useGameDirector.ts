import { useEffect, useRef, useState } from 'react';
import type { AnyRoomView, GameId, RoomView } from '@balik/shared';
import { getLastStateMessage, onStateMessage, type StateMessage } from '../net/client';
import { brandAudio } from '../brand/audio';
import { feedbackGate } from '../brand/feedback';
import type { SoundKind } from '../brand/tokens';
import type { EnvironmentSignal } from '../table/environment';
import { useEnvironmentSignals } from '../table/useEnvironmentSignals';

/** One display change: applied, optionally announced to the table and audio, then waited for. */
export interface GameStep<D> { apply: (d: D) => D; wait: number; sound?: SoundKind; environment?: EnvironmentSignal }
export interface GameScript<G extends GameId, D, E> {
  gameId: G;
  /** First event of a round; a client joining mid-deal replays from it. */
  startedType: string;
  reconcile: (view: NonNullable<RoomView<G>['game']>, me: string, prev?: D) => D;
  steps: (event: E, me: string, target: NonNullable<RoomView<G>['game']>) => GameStep<D>[];
}

/**
 * Ordered semantic cues for one game, shared by every game added after Sedma and Lhář.
 * Resets cancel timers and audio; nothing is replayed after a reconnect, and the director
 * reconciles with the authoritative snapshot whenever the queue drains.
 */
export function useGameDirector<G extends GameId, D, E>(room: RoomView<G>, script: GameScript<G, D, E>, quiet: boolean) {
  const [display, setDisplay] = useState(() => script.reconcile(room.game!, room.you));
  const [idle, setIdle] = useState(true);
  const { pulses: environment, emitEnvironment, clearEnvironment } = useEnvironmentSignals();
  const state = useRef({ display, target: room, seq: room.seq, generation: 0, running: false,
    queue: [] as { step: GameStep<D>; key: string }[], timer: 0, wake: (() => {}) as () => void });
  const quietRef = useRef(quiet); quietRef.current = quiet;
  const scriptRef = useRef(script); scriptRef.current = script;
  useEffect(() => {
    const s = state.current;
    const { gameId, startedType } = scriptRef.current;
    const reconcile = (view: NonNullable<RoomView<G>['game']>, prev?: D) => scriptRef.current.reconcile(view, room.you, prev);
    const commit = (next: D) => { s.display = next; setDisplay(next); };
    const reset = (target: RoomView<G>) => {
      s.generation++; clearTimeout(s.timer); s.wake(); s.queue = []; s.running = false;
      brandAudio.cancel(); clearEnvironment(); s.target = target; s.seq = target.seq;
      if (target.game) commit(reconcile(target.game, s.display)); setIdle(true);
    };
    const run = async () => {
      if (s.running) return;
      s.running = true; setIdle(false); const generation = s.generation;
      while (s.queue.length) {
        const { step, key } = s.queue.shift()!;
        const scale = quietRef.current ? .15 : s.queue.length > 14 ? .35 : s.queue.length > 7 ? .6 : 1;
        const before = s.display, next = step.apply(before);
        commit(next);
        if (next !== before && step.environment && !document.hidden) emitEnvironment({ ...step.environment, scale });
        if (step.sound && !document.hidden) feedbackGate.once(key, () => brandAudio.play(step.sound!));
        if (step.wait) await new Promise<void>((resolve) => { s.wake = resolve; s.timer = window.setTimeout(resolve, step.wait * scale); });
        if (generation !== s.generation) return;
      }
      if (s.target.game) commit(reconcile(s.target.game, s.display));
      s.running = false; setIdle(true);
    };
    const receive = (msg: StateMessage) => {
      const incoming = msg.room as AnyRoomView;
      if (incoming.gameId !== gameId || incoming.code !== room.code || incoming.you !== room.you || !incoming.game) return;
      const target = incoming as unknown as RoomView<G>;
      if (msg.reset || document.hidden) return reset(target);
      const fresh = msg.events.filter((e) => e.seq > s.seq);
      if ((fresh.length && fresh[0]!.seq !== s.seq + 1) || (!fresh.length && target.seq > s.seq)) return reset(target);
      if (target.round !== s.target.round) { brandAudio.cancel(); clearEnvironment(); }
      s.target = target;
      if (!fresh.length) { if (!s.running) commit(reconcile(target.game!, s.display)); return; }
      for (const event of fresh) scriptRef.current.steps(event as unknown as E, room.you, target.game!)
        .forEach((step, i) => s.queue.push({ step, key: `${room.code}:${room.you}:${target.round}:${gameId}:${event.seq}:${i}` }));
      s.seq = fresh.at(-1)!.seq; void run();
    };
    const last = getLastStateMessage();
    if (last?.room.code === room.code && !last.reset && last.events[0]?.type === startedType && last.room.seq === room.seq) { s.seq = last.events[0].seq - 1; receive(last); }
    else reset(room);
    const off = onStateMessage(receive);
    const visibility = () => reset(s.target);
    document.addEventListener('visibilitychange', visibility);
    return () => { off(); s.generation++; clearTimeout(s.timer); s.wake(); s.queue = []; s.running = false; brandAudio.cancel(); clearEnvironment(false); document.removeEventListener('visibilitychange', visibility); };
  }, [room.code, room.you, emitEnvironment, clearEnvironment]);
  return { display, idle, environment };
}
