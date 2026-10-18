import { describe, expect, it } from 'vitest';
import { applyPetrAction, createPetrRound, mulberry32, petrDeck, takePairs, PETR_CARD_ID, type PetrState } from '../src';
import { clientMessageSchema } from '../src/schema';
import { playthrough } from './helpers/playthrough';

/** Others' cards are hidden, except cards the viewer once held: a robbed player knows what they lost. */
const secretFor = () => {
  const held = new Map<string, Set<string>>();
  return (s: unknown, viewer: string) => {
    const st = s as PetrState;
    const mine = held.get(viewer) ?? new Set<string>();
    for (const c of st.players.find((p) => p.id === viewer)!.hand) mine.add(c.id);
    held.set(viewer, mine);
    return st.players.filter((p) => p.id !== viewer).flatMap((p) => p.hand.map((c) => c.id)).filter((id) => !mine.has(id));
  };
};

describe('Černý Petr', () => {
  it('uses 29 cards with the black jack alone and lays down pairs of equal rank', () => {
    const deck = petrDeck();
    expect(deck).toHaveLength(29);
    expect(deck.filter((c) => c.rank === 'J').map((c) => c.id)).toEqual([PETR_CARD_ID]);
    const hand = deck.filter((c) => c.rank === '7' || c.id === PETR_CARD_ID).slice(0, 4);
    const pairs = takePairs(hand);
    expect(pairs.flat().every((c) => c.rank === '7')).toBe(true);
  });
  it('ends every bot game with the Petr holder as the only loser, never revealing hands', () => {
    for (const n of [2, 3, 4]) for (let seed = 1; seed <= 30; seed++) {
      const { state, winners } = playthrough('petr', ['a', 'b', 'c', 'd'].slice(0, n), seed, secretFor());
      const s = state as PetrState;
      const loser = s.players.find((p) => p.id === s.result!.loserId)!;
      expect(loser.hand.map((c) => c.id)).toEqual([PETR_CARD_ID]);
      expect(winners).toHaveLength(n - 1);
    }
  });
  it('rejects a pick outside the neighbour hand and moves exactly one card', () => {
    const s = createPetrRound(['a', 'b'], 0, mulberry32(4)).state;
    const target = s.players[(s.currentIndex + 1) % 2]!;
    expect(applyPetrAction(s, s.players[s.currentIndex]!.id, { type: 'petrDraw', index: target.hand.length }, mulberry32(1)).ok).toBe(false);
    const before = s.players.reduce((n, p) => n + p.hand.length, 0) + s.pairs.length * 2;
    const r = applyPetrAction(s, s.players[s.currentIndex]!.id, { type: 'petrDraw', index: 0 }, mulberry32(1));
    if (!r.ok) throw Error(r.error);
    expect(r.state.players.reduce((n, p) => n + p.hand.length, 0) + r.state.pairs.length * 2).toBe(before);
  });
  it('accepts its action over the wire', () => {
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'petrDraw', index: 3 } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'petrDraw', index: -1 } }).success).toBe(false);
  });
});
