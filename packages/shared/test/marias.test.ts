import { describe, expect, it } from 'vitest';
import { applyMariasAction, chooseMariasBotFromView, createDeck32, createMariasRound, filterMariasEventFor, mariasDeclareOk, mariasDiscardOk, mariasLegal, mariasViewFor, mulberry32, type MariasState } from '../src';
import { clientMessageSchema } from '../src/schema';
import { playthrough } from './helpers/playthrough';

const card = (id: string) => createDeck32().find((c) => c.id === id)!;
const secret = (s: unknown, viewer: string) => {
  const st = s as MariasState;
  return [...st.players.filter((p) => p.id !== viewer).flatMap((p) => p.hand), ...st.stock, ...(st.phase === 'finished' || st.players[st.declarerIndex]!.id === viewer ? [] : st.talon)].map((c) => c.id);
};
const ok = (r: ReturnType<typeof applyMariasAction>) => { if (!r.ok) throw Error(r.error); return r.state; };
/** A trump game in progress with the given hands; `a` declares and leads. */
const table = (contract: MariasState['contract'], hands: string[][], extra: Partial<MariasState> = {}) => {
  const s = createMariasRound(['a', 'b', 'c'], 0, mulberry32(1)).state;
  Object.assign(s, { phase: 'playing', contract, trump: 'clubs', trumpCard: card('clubs-7'), currentIndex: 0, leaderIndex: 0, ...extra });
  hands.forEach((h, i) => { s.players[i]!.hand = h.map(card); });
  return s;
};
/** Plays out the hands, each seat playing its first legal card in the order given. */
const playOut = (s: MariasState) => {
  while (s.phase !== 'finished') {
    const me = s.players[s.currentIndex]!;
    const legal = new Set(mariasLegal(s, me.hand, true).map((a) => 'cardId' in a && a.cardId));
    s = ok(applyMariasAction(s, me.id, { type: 'mariasPlay', cardId: me.hand.find((c) => legal.has(c.id))!.id }));
  }
  return s.result!;
};

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
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'mariasDeclare', discard: ['hearts-7', 'hearts-8'], contract: 'kilo', sedma: true } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'mariasFlek', flek: false } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'mariasDeclare', discard: ['hearts-7'], contract: 'hra' } }).success).toBe(false);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'mariasFlek' } }).success).toBe(false);
  });

  describe('Hra se sedmou', () => {
    it('can only be bet in a trump game while keeping the 7 of trumps', () => {
      const hand = ['clubs-7', 'clubs-8', 'hearts-8', 'hearts-9'].map(card);
      expect(mariasDeclareOk(hand, 'clubs', ['hearts-8', 'hearts-9'], 'hra', true)).toBe(true);
      expect(mariasDeclareOk(hand, 'clubs', ['clubs-7', 'hearts-9'], 'hra', true)).toBe(false);
      expect(mariasDeclareOk(hand, 'clubs', ['hearts-8', 'hearts-9'], 'betl', true)).toBe(false);
      expect(mariasDeclareOk(hand, 'spades', ['hearts-8', 'hearts-9'], 'hra', true)).toBe(false);
    });
    it('wins when the declarer takes the last trick with the 7 of trumps, scored apart from the hra', () => {
      // a takes the first trick with the trump ace (20 points), then the last trick with the trump 7.
      const r = playOut(table('hra', [['clubs-A', 'clubs-7'], ['hearts-A', 'hearts-8'], ['hearts-10', 'spades-8']], { sedma: true }));
      expect(r.sedmaWon).toBe(true);
      expect(r.contractWon).toBe(true);
      expect(r.stake).toBe(1 + 2);
      expect(r.winnerIds).toEqual(['a']);
    });
    it('is lost when the 7 of trumps does not take the last trick, while the hra may still come off', () => {
      // b takes the hearts (20) and the last trick with the trump 8 over a's trump 7.
      const r = playOut(table('hra', [['hearts-8', 'clubs-7'], ['hearts-A', 'clubs-8'], ['hearts-10', 'spades-8']], { sedma: true }));
      expect(r.contractWon).toBe(false);
      expect(r.sedmaWon).toBe(false);
      expect(r.stake).toBe(-1 - 2);
      // a takes 20 with the spade ace, b the last trick (10): the hra comes off, the sedma does not.
      const won = playOut(table('hra', [['spades-A', 'clubs-7'], ['spades-8', 'clubs-8'], ['spades-10', 'hearts-8']], { sedma: true }));
      expect(won.contractWon).toBe(true);
      expect(won.sedmaWon).toBe(false);
      expect(won.stake).toBe(1 - 2);
      expect(won.winnerIds).toEqual(['b', 'c']);
    });
    it('is lost when the declarer plays the 7 of trumps before the last trick', () => {
      const r = playOut(table('hra', [['clubs-7', 'clubs-A'], ['hearts-8', 'hearts-A'], ['spades-8', 'hearts-10']], { sedma: true }));
      expect(r.sedmaWon).toBe(false);
    });
  });

  describe('Kilo', () => {
    it('needs the declarer to keep the trump marriage', () => {
      const hand = ['clubs-K', 'clubs-Q', 'hearts-8', 'hearts-9'].map(card);
      expect(mariasDeclareOk(hand, 'clubs', ['hearts-8', 'hearts-9'], 'kilo')).toBe(true);
      expect(mariasDeclareOk(hand, 'clubs', ['clubs-K', 'hearts-9'], 'kilo')).toBe(false);
      expect(mariasDeclareOk(hand, 'hearts', ['clubs-K', 'clubs-Q'], 'kilo')).toBe(false);
    });
    it('comes off with the trump marriage and at least 60 points from tricks', () => {
      // a announces 40, then takes every trick: four aces and tens plus the last trick = 60.
      const r = playOut(table('kilo', [['clubs-Q', 'clubs-K', 'clubs-A', 'clubs-10', 'spades-A'], ['hearts-A', 'hearts-8', 'hearts-10', 'diamonds-7', 'diamonds-8'], ['spades-7', 'spades-8', 'spades-9', 'spades-J', 'diamonds-9']]));
      expect(r.declarerTrickPoints).toBe(60);
      expect(r.declarerPoints).toBe(100);
      expect(r.contractWon).toBe(true);
      expect(r.stake).toBe(4);
      expect(r.winnerIds).toEqual(['a']);
    });
    it('fails below 60 trick points even when the declarer has more points than the defence', () => {
      // a announces 40 and takes every trick, but there are only 50 trick points in play.
      const r = playOut(table('kilo', [['clubs-Q', 'clubs-K', 'clubs-A', 'spades-A', 'diamonds-10'], ['hearts-8', 'hearts-9', 'clubs-7', 'diamonds-7', 'diamonds-8'], ['spades-7', 'spades-8', 'spades-9', 'hearts-A', 'diamonds-9']]));
      expect(r.declarerTrickPoints).toBeLessThan(60);
      expect(r.declarerPoints).toBeGreaterThan(r.defenderPoints);
      expect(r.contractWon).toBe(false);
      expect(r.stake).toBe(-4);
      expect(r.winnerIds).toEqual(['b', 'c']);
    });
  });

  describe('Flekování', () => {
    const declared = (seed = 3) => {
      let s = createMariasRound(['a', 'b', 'c'], 0, mulberry32(seed)).state;
      s = ok(applyMariasAction(s, 'a', { type: 'mariasTrump', cardId: s.players[0]!.hand[0]!.id }));
      const plain = s.players[0]!.hand.filter((c) => c.rank !== 'A' && c.rank !== '10').slice(0, 2).map((c) => c.id);
      return ok(applyMariasAction(s, 'a', { type: 'mariasDeclare', discard: plain, contract: 'hra' }));
    };
    it('asks both defenders, then starts play with the declarer leading when nobody fleks', () => {
      let s = declared();
      expect(s.phase).toBe('flek');
      expect(applyMariasAction(s, 'a', { type: 'mariasFlek', flek: true }).ok).toBe(false);
      expect(applyMariasAction(s, 'b', { type: 'mariasPlay', cardId: s.players[1]!.hand[0]!.id }).ok).toBe(false);
      s = ok(applyMariasAction(s, 'b', { type: 'mariasFlek', flek: false }));
      expect(s.players[s.currentIndex]!.id).toBe('c');
      s = ok(applyMariasAction(s, 'c', { type: 'mariasFlek', flek: false }));
      expect(s.phase).toBe('playing');
      expect(s.flek).toBe(0);
      expect(s.players[s.currentIndex]!.id).toBe('a');
    });
    it('alternates flek, re, tutti between the sides and stops at the last level', () => {
      let s = declared();
      s = ok(applyMariasAction(s, 'b', { type: 'mariasFlek', flek: false }));
      s = ok(applyMariasAction(s, 'c', { type: 'mariasFlek', flek: true }));
      expect([s.flek, s.players[s.currentIndex]!.id]).toEqual([1, 'a']);
      s = ok(applyMariasAction(s, 'a', { type: 'mariasFlek', flek: true }));
      expect([s.flek, s.players[s.currentIndex]!.id]).toEqual([2, 'b']);
      s = ok(applyMariasAction(s, 'b', { type: 'mariasFlek', flek: true }));
      s = ok(applyMariasAction(s, 'a', { type: 'mariasFlek', flek: false }));
      expect([s.phase, s.flek]).toEqual(['playing', 3]);
      let max = declared();
      while (max.phase === 'flek') max = ok(applyMariasAction(max, max.players[max.currentIndex]!.id, { type: 'mariasFlek', flek: true }));
      expect(max.flek).toBe(5);
      expect(max.phase).toBe('playing');
    });
    it('doubles the whole stake, contract and sedma alike, per level', () => {
      const r = playOut(table('hra', [['spades-A', 'clubs-7'], ['spades-8', 'clubs-8'], ['spades-10', 'hearts-8']], { sedma: true, flek: 2 }));
      expect(r.flek).toBe(2);
      expect(r.stake).toBe((1 - 2) * 4);
    });
    it('lets bots answer the flek and keeps the defenders’ hands private', () => {
      const s = declared();
      const action = chooseMariasBotFromView(mariasViewFor(s, 'b'), 'b');
      expect(action.type).toBe('mariasFlek');
      const view = mariasViewFor(s, 'b');
      expect(view.players.find((p) => p.id === 'a')!.handCount).toBe(10);
      for (const c of s.players[0]!.hand.filter((c) => c.id !== s.trumpCard!.id)) expect(JSON.stringify(view)).not.toContain(`"${c.id}"`);
      const declaredEvent = filterMariasEventFor({ type: 'mariasDeclared', playerId: 'a', contract: 'hra', sedma: true, discard: s.talon }, 'b');
      expect(declaredEvent).toEqual({ type: 'mariasDeclared', playerId: 'a', contract: 'hra', sedma: true, discardCount: 2 });
    });
  });
});
