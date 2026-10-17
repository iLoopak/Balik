import { describe, expect, it } from 'vitest';
import {
  applyLharAction,
  chooseLharBotFromView,
  createDeck32,
  createLharRound,
  filterLharEventFor,
  lharViewFor,
  mulberry32,
  removeLharPlayer,
  type Card,
  type LharAction,
  type LharState,
} from '../src';
import { clientMessageSchema } from '../src/schema';
const deck = createDeck32(),
  card = (id: string) => deck.find((c) => c.id === id)!;
function setup(own: string[] = ['hearts-7', 'hearts-8']): LharState {
  const s = createLharRound(['a', 'b'], 0, mulberry32(1)).state;
  s.players[0]!.hand = own.map(card);
  s.players[1]!.hand = deck.filter((c) => !own.includes(c.id));
  return s;
}
function act(s: LharState, id: string, action: LharAction) {
  const r = applyLharAction(s, id, action);
  if (!r.ok) throw Error(r.error);
  return r;
}
const play = (ids: string[], rank: Card['rank'] = '7'): LharAction => ({
  type: 'lharPlay',
  cardIds: ids,
  declaredRank: rank,
});
function conserved(s: LharState) {
  const all = [...s.players.flatMap((p) => p.hand), ...s.pile];
  expect(all).toHaveLength(32);
  expect(new Set(all.map((c) => c.id))).toEqual(new Set(deck.map((c) => c.id)));
}
describe('Lhář: one authoritative rule set', () => {
  it('deals all 32 cards round-robin, rotates the two extra cards at three seats', () => {
    for (const n of [2, 3, 4])
      for (let start = 0; start < n; start++) {
        const { state, events } = createLharRound(
          Array.from({ length: n }, (_, i) => `p${i}`),
          start,
          mulberry32(41),
        );
        conserved(state);
        expect(state.pile).toEqual([]);
        expect(state.requiredRank).toBe('7');
        expect(state.currentIndex).toBe(start);
        expect(state.players.map((p) => p.hand.length).sort()).toEqual(
          n === 2 ? [16, 16] : n === 3 ? [10, 11, 11] : [8, 8, 8, 8],
        );
        if (n === 3) {
          expect(state.players[start]!.hand).toHaveLength(11);
          expect(state.players[(start + 1) % n]!.hand).toHaveLength(11);
        }
        expect(events[0]).toMatchObject({ type: 'lharStarted', dealOrder: expect.any(Array) });
      }
    expect(() => createLharRound(['a', 'a'], 0, mulberry32(1))).toThrow();
  });
  it('validates turn, 1–4 distinct owned cards, forced rank and phase before mutation', () => {
    const s = setup(),
      before = structuredClone(s);
    for (const bad of [
      play([]),
      play(['hearts-7', 'hearts-7']),
      play(['spades-A']),
      play(['hearts-7'], '8'),
      play(deck.slice(0, 5).map((c) => c.id)),
      { type: 'draw' },
    ])
      expect(applyLharAction(s, 'a', bad).ok).toBe(false);
    expect(applyLharAction(s, 'b', play(['spades-A']))).toMatchObject({ ok: false, error: 'not-your-turn' });
    expect(s).toEqual(before);
    s.phase = 'finished';
    expect(applyLharAction(s, 'a', play(['hearts-7']))).toMatchObject({ ok: false, error: 'game-finished' });
  });
  it('advances 7–A cyclically; a new valid play closes exactly the previous challenge window', () => {
    let s = createLharRound(['a', 'b', 'c'], 0, mulberry32(7)).state;
    const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A', '7'] as const;
    for (const rank of ranks) {
      const p = s.players[s.currentIndex]!;
      expect(s.requiredRank).toBe(rank);
      s = act(s, p.id, play([p.hand[0]!.id], rank)).state;
      conserved(s);
    }
    expect(s.history.at(-2)?.outcome).toBe('accepted');
    const p = s.players[s.currentIndex]!;
    expect(applyLharAction(s, p.id, { type: 'lharChallenge', claimId: s.lastClaim!.id - 1 }).ok).toBe(false);
  });
  it('truthful claim sends the whole pile to challenger; claimant starts again from seven', () => {
    let s = setup(['hearts-7', 'hearts-8']);
    s = act(s, 'a', play(['hearts-7'])).state;
    const r = act(s, 'b', { type: 'lharChallenge', claimId: 1 });
    s = r.state;
    conserved(s);
    expect(s.lastResolution).toMatchObject({
      truthful: true,
      collectorId: 'b',
      pileCount: 1,
      revealed: [card('hearts-7')],
    });
    expect(s.currentIndex).toBe(0);
    expect(s.requiredRank).toBe('7');
    expect(s.lastClaim).toBeNull();
    expect(s.pile).toEqual([]);
    expect(s.phase).toBe('playing');
  });
  it('lying claimant collects older hidden sets too; successful challenger restarts', () => {
    let s = setup(['hearts-7', 'hearts-8']);
    s = act(s, 'a', play(['hearts-8'])).state;
    // Invalid next play must not silently accept or discard the open claim.
    const before = structuredClone(s);
    expect(applyLharAction(s, 'b', play(['diamonds-8'], '7')).ok).toBe(false);
    expect(s).toEqual(before);
    s = act(s, 'b', play(['diamonds-9'], '8')).state;
    const r = act(s, 'a', { type: 'lharChallenge', claimId: 2 });
    s = r.state;
    conserved(s);
    expect(s.lastResolution).toMatchObject({
      truthful: false,
      collectorId: 'b',
      pileCount: 2,
      revealed: [card('diamonds-9')],
    });
    expect(s.players[1]!.hand.map((c) => c.id)).toContain('hearts-8');
    expect(s.currentIndex).toBe(0);
    expect(s.requiredRank).toBe('8');
    const resolved = r.events.find((e) => e.type === 'lharResolved')!;
    expect(JSON.stringify(resolved)).not.toContain('hearts-8');
  });
  it('cannot accept without a pending win or challenge without an open claim', () => {
    const s = setup();
    expect(applyLharAction(s, 'a', { type: 'lharChallenge', claimId: 1 }).ok).toBe(false);
    const next = act(s, 'a', play(['hearts-7'])).state;
    expect(applyLharAction(next, 'b', { type: 'lharAccept', claimId: 1 }).ok).toBe(false);
    expect(applyLharAction(next, 'b', { type: 'lharChallenge', claimId: 0 }).ok).toBe(false);
  });
  it('does not win on the last hidden card; acceptance closes without revealing it', () => {
    const s = act(setup(['hearts-8']), 'a', play(['hearts-8'])).state;
    expect(s.phase).toBe('playing');
    expect(s.winnerId).toBeNull();
    expect(lharViewFor(s, 'b').pendingWinnerId).toBe('a');
    expect(applyLharAction(s, 'b', play(['diamonds-8'], '8')).ok).toBe(false);
    const r = act(s, 'b', { type: 'lharAccept', claimId: 1 });
    expect(r.state).toMatchObject({
      phase: 'finished',
      winnerId: 'a',
      result: { winnerIds: ['a'], reason: 'cards' },
    });
    expect(r.events.map((e) => e.type)).toEqual(['lharEnded']);
    expect(JSON.stringify(lharViewFor(r.state, 'b'))).not.toContain('hearts-8');
  });
  it('last truthful claim wins only after challenge, last lie recovers the pile and keeps playing', () => {
    for (const [id, truthful] of [
      ['hearts-7', true],
      ['hearts-8', false],
    ] as const) {
      const s = act(setup([id]), 'a', play([id])).state;
      const next = act(s, 'b', { type: 'lharChallenge', claimId: 1 }).state;
      conserved(next);
      expect(next.lastResolution!.truthful).toBe(truthful);
      expect(next.phase).toBe(truthful ? 'finished' : 'playing');
      expect(next.winnerId).toBe(truthful ? 'a' : null);
    }
  });
  it('never creates a normal win by leaving an unresolved claim; documents 3+ seat cancellation', () => {
    const s = act(setup(['hearts-8']), 'a', play(['hearts-8'])).state;
    const r = removeLharPlayer(s, 'a');
    expect(r.state.result).toEqual({ winnerIds: ['b'], reason: 'forfeit' });
    conserved(r.state);
    const three = createLharRound(['a', 'b', 'c'], 0, mulberry32(1)).state;
    expect(removeLharPlayer(three, 'b').state.result).toEqual({ winnerIds: [], reason: 'forfeit' });
  });
  it('schema rejects malformed, duplicate and oversized actions, accepts the third game and its ballot', () => {
    const packet = (action: unknown) =>
      clientMessageSchema.safeParse({ t: 'act', baseSeq: 0, action }).success;
    expect(packet(play(['hearts-7']))).toBe(true);
    expect(packet(play(['hearts-7', 'hearts-7']))).toBe(false);
    expect(packet({ type: 'lharPlay', cardIds: ['hearts-7'], declaredRank: '6' })).toBe(false);
    expect(packet({ type: 'lharChallenge', claimId: -1 })).toBe(false);
    expect(
      clientMessageSchema.safeParse({ t: 'create', token: 'a'.repeat(20), name: 'Ada', gameId: 'lhar' })
        .success,
    ).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'vote', ballotId: 1, gameId: 'lhar' }).success).toBe(true);
  });
});
describe('Lhář privacy and equal-information bots', () => {
  it('filters the entire deal and every private hand out of all other recipient views', () => {
    const { state, events } = createLharRound(['a', 'b', 'c', 'd'], 0, mulberry32(9));
    for (const p of state.players) {
      const view = lharViewFor(state, p.id),
        event = filterLharEventFor(events[0]!, p.id);
      expect(view.myHand).toEqual(p.hand);
      expect(event).toMatchObject({ myCards: p.hand });
      for (const other of state.players.filter((q) => q.id !== p.id))
        for (const c of other.hand) {
          expect(JSON.stringify(view)).not.toContain(c.id);
          expect(JSON.stringify(event)).not.toContain(c.id);
        }
    }
    expect(lharViewFor(state, 'spectator').myHand).toBeNull();
  });
  it('truth and lie produce indistinguishable opponent play responses and reconnect snapshots', () => {
    const s = setup();
    const truth = act(s, 'a', play(['hearts-7'])),
      lie = act(s, 'a', play(['hearts-8']));
    expect(lharViewFor(truth.state, 'b')).toEqual(lharViewFor(lie.state, 'b'));
    expect(truth.events.map((e) => filterLharEventFor(e, 'b'))).toEqual(
      lie.events.map((e) => filterLharEventFor(e, 'b')),
    );
    const actor = filterLharEventFor(lie.events[0]!, 'a');
    expect(actor).toMatchObject({ myCards: [card('hearts-8')] });
    const cloned = lharViewFor(lie.state, 'b');
    cloned.players[0]!.handCount = 900;
    expect(lie.state.players[0]!.hand).toHaveLength(1);
  });
  it('reveals only the challenged set publicly; older cards go privately only to pile recipient', () => {
    let s = setup();
    s = act(s, 'a', play(['hearts-8'])).state;
    s = act(s, 'b', play(['diamonds-9'], '8')).state;
    const r = act(s, 'a', { type: 'lharChallenge', claimId: 2 });
    const publicEvents = r.events.map((e) => filterLharEventFor(e, 'a'));
    expect(JSON.stringify(publicEvents)).toContain('diamonds-9');
    expect(JSON.stringify(publicEvents)).not.toContain('hearts-8');
    expect(JSON.stringify(r.events.map((e) => filterLharEventFor(e, 'b')))).toContain('hearts-8');
    expect(JSON.stringify(lharViewFor(r.state, 'a'))).not.toContain('hearts-8');
  });
  it('bot action is identical for raw states with different hidden truth but the same allowed view', () => {
    const s = setup();
    const truth = act(s, 'a', play(['hearts-7'])).state,
      lie = act(s, 'a', play(['hearts-8'])).state;
    expect(chooseLharBotFromView(lharViewFor(truth, 'b'), 'b', mulberry32(4))).toEqual(
      chooseLharBotFromView(lharViewFor(lie, 'b'), 'b', mulberry32(4)),
    );
    const view = lharViewFor(truth, 'b');
    view.myHand = [card('diamonds-7'), card('clubs-7'), card('spades-7')];
    view.lastClaim!.count = 2;
    expect(chooseLharBotFromView(view, 'b', () => 0.99)).toEqual({ type: 'lharChallenge', claimId: 1 });
  });
  it('finishes seeded 2/3/4-player games legally using only private player views, conserving every card', () => {
    for (const n of [2, 3, 4])
      for (const seed of Array.from({ length: 50 }, (_, i) => i + 1)) {
        const rng = mulberry32(seed);
        let s = createLharRound(
          Array.from({ length: n }, (_, i) => `p${i}`),
          0,
          rng,
        ).state;
        for (let turn = 0; turn < 1000 && s.phase === 'playing'; turn++) {
          const id = s.players[s.currentIndex]!.id;
          const a = chooseLharBotFromView(lharViewFor(s, id), id, rng);
          s = act(s, id, a).state;
          conserved(s);
        }
        expect(s.phase).toBe('finished');
        expect(s.result?.winnerIds).toHaveLength(1);
        expect(s.players.find((p) => p.id === s.winnerId)!.hand).toHaveLength(0);
      }
  });
});
