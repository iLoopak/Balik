import { describe, expect, it } from 'vitest';
import { applyMariasAction, createDeck32, createMariasRound, mariasDiscardOk, mulberry32, type MariasState } from '../src';
import { clientMessageSchema } from '../src/schema';
import { playthrough } from './helpers/playthrough';

const card = (id: string) => createDeck32().find((c) => c.id === id)!;
const secret = (s: unknown, viewer: string) => {
  const st = s as MariasState;
  return [...st.players.filter((p) => p.id !== viewer).flatMap((p) => p.hand), ...st.stock, ...(st.phase === 'finished' || st.players[st.declarerIndex]!.id === viewer ? [] : st.talon)].map((c) => c.id);
};
const ok = (r: ReturnType<typeof applyMariasAction>) => { if (!r.ok) throw Error(r.error); return r.state; };

describe('Volený mariáš', () => {
  it('finishes every bot game with the declarer or both defenders winning, hiding hands, stock and talon', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { state, winners } = playthrough('marias', ['a', 'b', 'c'], seed, secret);
      const s = state as MariasState;
      expect(winners.length === 1 ? winners[0] === s.result!.declarerId : winners.length === 2 && !winners.includes(s.result!.declarerId)).toBe(true);
      if (s.result!.contract === 'hra' && s.result!.reason === 'points') expect(s.result!.declarerPoints + s.result!.defenderPoints).toBeGreaterThanOrEqual(90);
    }
  });
  it('deals 7 for the trump choice, then 12/10/10, and forbids laying away aces and tens in a trump game', () => {
    let s = createMariasRound(['a', 'b', 'c'], 0, mulberry32(3)).state;
    expect(s.players.map((p) => p.hand.length)).toEqual([7, 0, 0]);
    s = ok(applyMariasAction(s, 'a', { type: 'mariasTrump', cardId: s.players[0]!.hand[0]!.id }));
    expect(s.players.map((p) => p.hand.length)).toEqual([12, 10, 10]);
    const ace = s.players[0]!.hand.find((c) => c.rank === 'A' || c.rank === '10');
    if (ace) expect(mariasDiscardOk(s.players[0]!.hand, [ace.id, s.players[0]!.hand.find((c) => c !== ace)!.id], 'hra')).toBe(false);
    const plain = s.players[0]!.hand.filter((c) => c.rank !== 'A' && c.rank !== '10').slice(0, 2).map((c) => c.id);
    s = ok(applyMariasAction(s, 'a', { type: 'mariasDeclare', discard: plain, contract: 'hra' }));
    expect(s.players.map((p) => p.hand.length)).toEqual([10, 10, 10]);
  });
  it('ranks the ten between the king and the ace in a trump game and forces trumping', () => {
    const s = createMariasRound(['a', 'b', 'c'], 0, mulberry32(1)).state;
    Object.assign(s, { phase: 'playing', contract: 'hra', trump: 'clubs', trumpCard: card('clubs-7'), currentIndex: 0, leaderIndex: 0 });
    s.players[0]!.hand = [card('hearts-K')]; s.players[1]!.hand = [card('hearts-10'), card('clubs-8')]; s.players[2]!.hand = [card('clubs-9'), card('spades-A')];
    let t = ok(applyMariasAction(s, 'a', { type: 'mariasPlay', cardId: 'hearts-K' }));
    t = ok(applyMariasAction(t, 'b', { type: 'mariasPlay', cardId: 'hearts-10' }));
    expect(applyMariasAction(t, 'c', { type: 'mariasPlay', cardId: 'spades-A' }).ok).toBe(false);
    t = ok(applyMariasAction(t, 'c', { type: 'mariasPlay', cardId: 'clubs-9' }));
    expect(t.lastTrick!.winnerId).toBe('c');
  });
  it('announces a trump marriage for 40 when its queen is played with the king in hand', () => {
    const s = createMariasRound(['a', 'b', 'c'], 0, mulberry32(1)).state;
    Object.assign(s, { phase: 'playing', contract: 'hra', trump: 'clubs', trumpCard: card('clubs-7'), currentIndex: 0, leaderIndex: 0 });
    s.players[0]!.hand = [card('clubs-Q'), card('clubs-K')]; s.players[1]!.hand = [card('hearts-7'), card('hearts-8')]; s.players[2]!.hand = [card('spades-7'), card('spades-8')];
    const t = ok(applyMariasAction(s, 'a', { type: 'mariasPlay', cardId: 'clubs-Q' }));
    expect(t.players[0]!.points).toBe(40);
  });
  it('accepts its actions over the wire', () => {
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'mariasDeclare', discard: ['hearts-7', 'hearts-8'], contract: 'betl' } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'mariasDeclare', discard: ['hearts-7'], contract: 'hra' } }).success).toBe(false);
  });
});
