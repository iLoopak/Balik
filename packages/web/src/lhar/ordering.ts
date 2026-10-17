import type { GameSeqEvent } from '@balik/shared';
/** Ordered server frames, including reconnects: no stale batch can address a reused round-local claim ID. */
export function inspectLharFrame(
  cursor: { seq: number; round: number },
  target: { seq: number; round: number },
  events: readonly GameSeqEvent[],
  reset: boolean,
): { mode: 'ignore' | 'reset' | 'append'; fresh: GameSeqEvent[] } {
  if (target.round < cursor.round || target.seq < cursor.seq) return { mode: 'ignore', fresh: [] };
  const fresh = events.filter((e) => e.seq > cursor.seq);
  if (
    reset ||
    fresh.some((e, i) => e.seq !== cursor.seq + i + 1 || !e.type.startsWith('lhar')) ||
    (fresh.at(-1)?.seq ?? cursor.seq) !== target.seq
  )
    return { mode: 'reset', fresh: [] };
  if (target.round !== cursor.round && fresh[0]?.type !== 'lharStarted') return { mode: 'reset', fresh: [] };
  return { mode: 'append', fresh };
}
