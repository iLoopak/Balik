import { describe, expect, it } from 'vitest';
import { applyPexesoAction, createDeck32, createPexesoRound, mulberry32, pexesoPair, pexesoViewFor, type PexesoState } from '../src';
import { clientMessageSchema } from '../src/schema';
import { playthrough } from './helpers/playthrough';

const card = (id: string) => createDeck32().find((c) => c.id === id)!;
const secret = (s: unknown) => (s as PexesoState).board.flatMap((c, i) => (c && !(s as PexesoState).flipped.includes(i) ? [c.id] : []));

describe('Pexeso', () => {
  it('pairs the same rank in the same colour only', () => {
    expect(pexesoPair(card('hearts-7'), card('diamonds-7'))).toBe(true);
    expect(pexesoPair(card('clubs-K'), card('spades-K'))).toBe(true);
    expect(pexesoPair(card('hearts-7'), card('clubs-7'))).toBe(false);
    expect(pexesoPair(card('hearts-7'), card('diamonds-8'))).toBe(false);
  });
  it('clears the board in every bot game, solo included, never showing face-down cards', () => {
    for (const n of [1, 2, 3, 4]) for (let seed = 1; seed <= 15; seed++) {
      const { state, winners } = playthrough('pexeso', ['a', 'b', 'c', 'd'].slice(0, n), seed, secret, 4000);
      const s = state as PexesoState;
      expect(s.players.reduce((k, p) => k + p.pairs, 0)).toBe(16);
      expect(winners.length).toBeGreaterThan(0);
    }
  });
  it('keeps the turn after a pair and passes it after a miss', () => {
    const s = createPexesoRound(['a', 'b'], 0, mulberry32(1)).state;
    s.board = createDeck32().sort((x, y) => x.rank.localeCompare(y.rank));
    const red7 = s.board.findIndex((c) => c!.id === 'hearts-7'), red7b = s.board.findIndex((c) => c!.id === 'diamonds-7'), black7 = s.board.findIndex((c) => c!.id === 'clubs-7');
    let r = applyPexesoAction(s, 'a', { type: 'pexesoFlip', index: red7 }); if (!r.ok) throw Error(r.error);
    expect(pexesoViewFor(r.state).board[red7]).toMatchObject({ state: 'up' });
    r = applyPexesoAction(r.state, 'a', { type: 'pexesoFlip', index: red7b }); if (!r.ok) throw Error(r.error);
    expect(r.state.players[0]!.pairs).toBe(1); expect(r.state.currentIndex).toBe(0);
    const t = applyPexesoAction(r.state, 'a', { type: 'pexesoFlip', index: black7 }); if (!t.ok) throw Error(t.error);
    const other = t.state.board.findIndex((c) => c && c.rank === '8');
    const u = applyPexesoAction(t.state, 'a', { type: 'pexesoFlip', index: other }); if (!u.ok) throw Error(u.error);
    expect(u.state.currentIndex).toBe(1);
    expect(applyPexesoAction(u.state, 'b', { type: 'pexesoFlip', index: red7 }).ok).toBe(false); // already taken
  });
  it('accepts its action over the wire', () => {
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'pexesoFlip', index: 31 } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'pexesoFlip', index: 32 } }).success).toBe(false);
  });
});
