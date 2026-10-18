import { describe, expect, it } from 'vitest';
import { applyOkoAction, createDeck32, createOkoRound, isOko, mulberry32, okoTotal, type OkoState } from '../src';
import { clientMessageSchema } from '../src/schema';
import { playthrough } from './helpers/playthrough';

const card = (id: string) => createDeck32().find((c) => c.id === id)!;
const secret = (s: unknown, viewer: string) => (s as OkoState).players.filter((p) => p.id !== viewer && p.status !== 'bust' && p.status !== 'oko').flatMap((p) => p.hand.map((c) => c.id));

describe('Oko bere', () => {
  it('counts Czech values and recognises two aces as oko', () => {
    expect(okoTotal([card('hearts-K'), card('clubs-Q'), card('spades-J'), card('diamonds-10')])).toBe(14);
    expect(isOko([card('hearts-A'), card('clubs-A')])).toBe(true);
    expect(okoTotal([card('hearts-A'), card('clubs-10')])).toBe(21);
  });
  it('plays whole matches with a rotating bank, scoring only points and hiding held cards', () => {
    for (const n of [2, 3, 4]) for (let seed = 1; seed <= 25; seed++) {
      const { state, winners } = playthrough('oko', ['a', 'b', 'c', 'd'].slice(0, n), seed, secret);
      const s = state as OkoState;
      expect(s.hand).toBe(Math.max(4, n * 2));
      const top = Math.max(...s.players.map((p) => p.score));
      expect(winners.sort()).toEqual(s.players.filter((p) => p.score === top).map((p) => p.id).sort());
    }
  });
  it('gives the bank ties and every bust, and pays an oko two points', () => {
    const s = createOkoRound(['a', 'b'], 0, mulberry32(1)).state; // bank is a, b plays first
    s.players[1]!.hand = [card('hearts-A')]; s.deck = [card('hearts-7'), card('clubs-A')];
    let r = applyOkoAction(s, 'b', { type: 'okoHit' }, mulberry32(1));
    if (!r.ok) throw Error(r.error);
    expect(r.state.players[1]!.status).toBe('oko');
    r = applyOkoAction(r.state, 'a', { type: 'okoStand' }, mulberry32(2));
    if (!r.ok) throw Error(r.error);
    expect(r.state.lastHand!.points).toMatchObject({ b: 2, a: 0 });
  });
  it('accepts its actions over the wire', () => {
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'okoHit' } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'okoStand' } }).success).toBe(true);
  });
});
