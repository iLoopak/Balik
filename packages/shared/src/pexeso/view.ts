import type { Rng } from '../cards';
import { pexesoLegal, pexesoPair } from './engine';
import type { PexesoAction, PexesoClientEvent, PexesoEvent, PexesoState, PexesoView } from './types';

export function pexesoViewFor(state: PexesoState): PexesoView {
  return {
    players: structuredClone(state.players), myHand: null,
    board: state.board.map((c, i) => (!c ? { state: 'gone' as const } : state.flipped.includes(i) ? { state: 'up' as const, card: { ...c } } : { state: 'down' as const })),
    currentPlayerId: state.players[state.currentIndex]!.id, turns: state.turns, seen: structuredClone(state.seen),
    phase: state.phase, winnerId: state.winnerId, result: structuredClone(state.result),
  };
}
/** Everything in Pexeso is public: the same events for everyone. */
export const filterPexesoEventFor = (event: PexesoEvent): PexesoClientEvent => structuredClone(event);
export function pexesoLegalFromView(view: PexesoView, id: string): PexesoAction[] {
  return pexesoLegal(view, [], view.currentPlayerId === id);
}
/**
 * A human-like memory: recent reveals are remembered well, older ones fade. With a known pair the
 * bot takes it; otherwise it turns an unknown card and looks for its partner in memory.
 */
export function choosePexesoBotFromView(view: PexesoView, id: string, rng: Rng): PexesoAction {
  const legal = pexesoLegalFromView(view, id).map((a) => a.index);
  const open = view.board.findIndex((s) => s.state === 'up');
  const memory = new Map<number, PexesoView['seen'][number]['card']>();
  for (const s of view.seen) if (view.board[s.index]?.state === 'down' && rng() < 0.9 - (view.turns - s.turn) * 0.06) memory.set(s.index, s.card);
  const unknown = legal.filter((i) => !memory.has(i));
  const pick = (from: number[]) => from[Math.floor(rng() * from.length)] ?? legal[0]!;
  if (open >= 0) {
    const card = (view.board[open] as { card: PexesoView['seen'][number]['card'] }).card;
    const partner = [...memory].find(([i, c]) => i !== open && legal.includes(i) && pexesoPair(card, c));
    return { type: 'pexesoFlip', index: partner ? partner[0] : pick(unknown.filter((i) => i !== open).length ? unknown.filter((i) => i !== open) : legal.filter((i) => i !== open)) };
  }
  const known = [...memory];
  for (const [i, c] of known) { const twin = known.find(([j, d]) => j !== i && pexesoPair(c, d)); if (twin && legal.includes(i)) return { type: 'pexesoFlip', index: i }; }
  return { type: 'pexesoFlip', index: pick(unknown.length ? unknown : legal) };
}
