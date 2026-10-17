import { describe, expect, it } from 'vitest';
import { applySedmaAction, canStartGame, chooseSedmaBotFromView, createDeck32, createSedmaRound, filterSedmaEventFor,
  mulberry32, removeSedmaPlayer, sedmaLegalActions, sedmaLegalFromView, sedmaResult, sedmaTrickWinner, sedmaViewFor,
  type Card, type SedmaState, type TrickCard } from '../src';
import { clientMessageSchema } from '../src/schema';
const deck = createDeck32();
const c = (id: string): Card => deck.find((card) => card.id === id)!;
const trick = (ids: string[]): TrickCard[] => ids.map((id, i) => ({ playerId: `p${i % 4}`, card: c(id) }));
function fixture(hands: string[][]): SedmaState {
  const state = createSedmaRound(hands.map((_, i) => `p${i}`), 0, mulberry32(1)).state;
  state.players.forEach((p, i) => { p.hand = hands[i]!.map(c); }); state.drawPile = [];
  return state;
}
function play(s: SedmaState, id: string) {
  const result = applySedmaAction(s, s.players[s.currentIndex]!.id, { type: 'play', cardId: id });
  if (!result.ok) throw new Error(result.error);
  return result;
}
function conservation(s: SedmaState) {
  const ids = [...s.players.flatMap((p) => p.hand), ...s.drawPile, ...s.captured.flat(), ...s.trick.map((p) => p.card)].map((card) => card.id);
  expect(ids).toHaveLength(32); expect(new Set(ids).size).toBe(32);
}

describe('Sedma documented rules', () => {
  it('deals four cards, stable teams, rotates lead, supports exactly two or four', () => {
    for (const count of [2, 4]) {
      const { state, events } = createSedmaRound(Array.from({ length: count }, (_, i) => `p${i}`), 1, mulberry32(3));
      conservation(state); expect(state.players.every((p) => p.hand.length === 4)).toBe(true);
      expect(state.currentIndex).toBe(1); expect(events[0]).toMatchObject({ type: 'sedmaStarted', dealOrder: Array.from({ length: 4 }, () => state.players.slice(1).concat(state.players[0]!).map((p) => p.id)).flat() });
      expect(state.players.map((p) => p.team)).toEqual(count === 2 ? [0, 1] : [0, 1, 0, 1]);
    }
    for (const count of [0, 1, 3, 5]) { expect(canStartGame('sedma', count)).toBe(false); expect(() => createSedmaRound(Array(count).fill('a'), 0, mulberry32(1))).toThrow(); }
  });
  it('takes the last original rank or seven, ignoring suit and ordinary rank order', () => {
    expect(sedmaTrickWinner(trick(['hearts-9', 'clubs-A', 'diamonds-7', 'spades-9']))).toBe('p3');
    expect(sedmaTrickWinner(trick(['hearts-K', 'clubs-7', 'diamonds-A', 'spades-8']))).toBe('p1');
    expect(sedmaTrickWinner(trick(['hearts-A', 'clubs-K']))).toBe('p0');
    expect(sedmaTrickWinner(trick(['hearts-7', 'clubs-A', 'diamonds-7', 'spades-10']))).toBe('p2');
  });
  it('rejects foreign cards, out-of-turn, drawing, premature collect and finished actions without mutation', () => {
    const state = createSedmaRound(['a', 'b'], 0, mulberry32(4)).state;
    const before = structuredClone(state);
    expect(applySedmaAction(state, 'b', { type: 'play', cardId: state.players[1]!.hand[0]!.id })).toMatchObject({ ok: false, error: 'not-your-turn' });
    for (const action of [{ type: 'play', cardId: 'fake' }, { type: 'draw' }, { type: 'collect' }]) expect(applySedmaAction(state, 'a', action).ok).toBe(false);
    expect(state).toEqual(before);
    expect(applySedmaAction({ ...state, phase: 'finished' }, 'a', { type: 'collect' }).ok).toBe(false);
    expect(sedmaLegalFromView(sedmaViewFor(state, 'a'), 'a')).toEqual(sedmaLegalActions(state, 'a'));
  });
  it('supports repeated circuits, only original rank or seven from leader, arbitrary replies', () => {
    let state = fixture([['hearts-9', 'clubs-9', 'hearts-7'], ['hearts-A', 'clubs-7', 'diamonds-10']]);
    state = play(state, 'hearts-9').state; state = play(state, 'hearts-A').state;
    expect(state.deciding).toBe(true); expect(state.currentIndex).toBe(0);
    expect(sedmaLegalActions(state, 'p0')).toEqual([{ type: 'play', cardId: 'clubs-9' }, { type: 'play', cardId: 'hearts-7' }, { type: 'collect' }]);
    state = play(state, 'clubs-9').state; state = play(state, 'clubs-7').state;
    expect(state.deciding).toBe(true); expect(state.trick).toHaveLength(4);
    state = play(state, 'hearts-7').state;
    const final = play(state, 'diamonds-10');
    expect(final.state.result).toMatchObject({ winnerTeam: 0, scores: [30, 0] });
    expect(final.events.find((e) => e.type === 'trickResolved')).toMatchObject({ winnerId: 'p0', points: 30 });
  });
  it('can stop while leader/team is winning and feeds both partners into one score', () => {
    let state = fixture([['hearts-9', 'hearts-8'], ['hearts-A', 'clubs-8'], ['clubs-9', 'diamonds-8'], ['clubs-10', 'spades-8']]);
    for (const id of ['hearts-9', 'hearts-A', 'clubs-9', 'clubs-10']) state = play(state, id).state;
    // Leader has no matching card, so this trick auto-resolves for partner p2.
    expect(state.lastTrick).toMatchObject({ winnerId: 'p2', team: 0, points: 20 });
    expect(state.scores).toEqual([20, 0]); expect(state.currentIndex).toBe(2);
    const continuing = fixture([['hearts-A', 'clubs-A'], ['hearts-K', 'clubs-8']]);
    const first = play(play(continuing, 'hearts-A').state, 'hearts-K').state;
    expect(first.deciding).toBe(true);
    const result = applySedmaAction(first, 'p0', { type: 'collect' }); expect(result.ok && result.state.scores).toEqual([10, 0]);
  });
  it('refills round-robin from winner and emits only private draws for their recipient', () => {
    let state = fixture([['hearts-9', 'hearts-8'], ['clubs-7', 'clubs-8']]);
    state.drawPile = ['spades-8','spades-9','spades-10','spades-J','spades-Q','spades-K'].map(c);
    state = play(state, 'hearts-9').state;
    const result = play(state, 'clubs-7');
    expect(result.state.players[1]!.hand.map((card) => card.id)).toEqual(['clubs-8', 'spades-K', 'spades-J', 'spades-9']);
    expect(result.state.players[0]!.hand.map((card) => card.id)).toEqual(['hearts-8', 'spades-Q', 'spades-10', 'spades-8']);
    const draws = result.events.filter((e) => e.type === 'sedmaDrawn');
    expect(draws.map((e) => e.playerId)).toEqual(['p1', 'p0', 'p1', 'p0', 'p1', 'p0']);
    for (const e of draws) expect(filterSedmaEventFor(e, 'outsider')).not.toHaveProperty('cards');
  });
  it('filters starting hands, snapshots, draw piles and captured identities for spectators/opponents', () => {
    const { state, events } = createSedmaRound(['a','b','c','d'], 0, mulberry32(8));
    const view = sedmaViewFor(state, 'a'); const start = filterSedmaEventFor(events[0]!, 'a');
    const payload = JSON.stringify({ view, start });
    for (const player of state.players.slice(1)) for (const card of player.hand) expect(payload).not.toContain(`"${card.id}"`);
    for (const card of state.drawPile) expect(payload).not.toContain(`"${card.id}"`);
    expect(view).not.toHaveProperty('captured'); expect(start).not.toHaveProperty('hands');
    expect(sedmaViewFor(state, 'outsider').myHand).toBeNull();
  });
  it('plays 160 complete seeded games, conserves every card each move and scores last trick exactly once', () => {
    let sawDraw = false;
    for (const n of [2, 4]) for (const bonus of [0, 10] as const) for (let seed = 0; seed < 40; seed++) {
      let state = createSedmaRound(Array.from({ length: n }, (_, i) => `p${i}`), seed % n, mulberry32(seed), bonus).state;
      let steps = 0;
      while (state.phase === 'playing' && steps++ < 65) {
        conservation(state);
        const id = state.players[state.currentIndex]!.id;
        const view = sedmaViewFor(state, id);
        const result = applySedmaAction(state, id, chooseSedmaBotFromView(view, id));
        if (!result.ok) throw new Error(result.error);
        expect(state).not.toBe(result.state); state = result.state;
      }
      expect(state.phase).toBe('finished'); conservation(state);
      expect(state.scores[0] + state.scores[1]).toBe(80 + bonus);
      expect(state.players.every((p) => p.hand.length === 0)).toBe(true);
      expect(state.captured.flat()).toHaveLength(32); expect(state.drawPile).toHaveLength(0);
      expect(state.result!.winnerIds).toEqual(state.players.filter((p) => p.team === state.result!.winnerTeam).map((p) => p.id));
      if (state.result!.winnerTeam === null) { sawDraw = true; expect(bonus).toBe(0); expect(state.scores).toEqual([40, 40]); }
    }
    expect(sawDraw).toBe(true);
  });
  it('represents ties and forfeits without losing teams or inventing points', () => {
    const state = createSedmaRound(['a','b','c','d'], 0, mulberry32(9), 0).state;
    state.scores = [40,40]; expect(sedmaResult(state)).toMatchObject({ winnerTeam: null, winnerIds: [] });
    const removed = removeSedmaPlayer(state, 'c');
    expect(removed.state.result).toMatchObject({ winnerIds: ['b','d'], winnerTeam: 1, reason: 'forfeit', scores: [40,40] });
    conservation(removed.state); expect(removeSedmaPlayer(removed.state, 'a').events).toEqual([]);
  });
  it('validates game ids/actions and keeps the legacy Prší wire contract', () => {
    const create = { t: 'create', token: 'token-123456789012', name: 'Ada' };
    expect(clientMessageSchema.safeParse(create).success).toBe(true);
    expect(clientMessageSchema.safeParse({ ...create, gameId: 'sedma', sedmaBonus: 0 }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ ...create, gameId: 'fake' }).success).toBe(false);
    expect(clientMessageSchema.safeParse({ ...create, sedmaBonus: 999 }).success).toBe(false);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'collect' } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: -1, action: { type: 'collect' } }).success).toBe(false);
  });
});
