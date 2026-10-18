import { describe, expect, it } from 'vitest';
import { applySnapsAction, createSnapsRound, mulberry32, snapsDeck, snapsViewFor, type SnapsState } from '../src';
import { clientMessageSchema } from '../src/schema';
import { playthrough } from './helpers/playthrough';

const card = (id: string) => snapsDeck().find((c) => c.id === id)!;
/** Hidden cards for a viewer; a card once shown face up as trump stays public after it is drawn or exchanged. */
const secretHands = () => {
  const shown = new Set<string>();
  return (s: unknown, viewer: string) => {
    const st = s as SnapsState;
    if (st.trumpCard) shown.add(st.trumpCard.id);
    return [...st.players.filter((p) => p.id !== viewer).flatMap((p) => p.hand.map((c) => c.id)), ...st.talon.map((c) => c.id)].filter((id) => !shown.has(id));
  };
};
function fixed(a: string[], b: string[], trump = 'clubs-A', talon: string[] = []): SnapsState {
  const s = createSnapsRound(['a', 'b'], 0, mulberry32(1)).state;
  s.players[0]!.hand = a.map(card); s.players[1]!.hand = b.map(card);
  s.trumpCard = card(trump); s.trump = card(trump).suit; s.talon = talon.map(card);
  return s;
}

describe('Šnaps / 66', () => {
  it('finishes every bot game with one winner, keeping hands and talon private', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { state, winners } = playthrough('snaps', ['a', 'b'], seed, secretHands());
      expect(winners).toHaveLength(1);
      const s = state as SnapsState;
      expect([1, 2, 3]).toContain(s.result!.gamePoints);
    }
  });
  it('lets anything be played while the talon is open, then enforces follow, head and trump', () => {
    let s = fixed(['hearts-9', 'spades-A'], ['hearts-A', 'hearts-J', 'clubs-9'], 'clubs-A', ['diamonds-9', 'diamonds-J']);
    let r = applySnapsAction(s, 'a', { type: 'snapsPlay', cardId: 'hearts-9' });
    expect(r.ok).toBe(true);
    expect(applySnapsAction((r as { state: SnapsState }).state, 'b', { type: 'snapsPlay', cardId: 'clubs-9' }).ok).toBe(true);
    s = fixed(['hearts-9'], ['hearts-A', 'hearts-J', 'clubs-9']); s.trumpCard = null; // exhausted: strict
    r = applySnapsAction(s, 'a', { type: 'snapsPlay', cardId: 'hearts-9' });
    const after = (r as { state: SnapsState }).state;
    expect(applySnapsAction(after, 'b', { type: 'snapsPlay', cardId: 'clubs-9' }).ok).toBe(false);
    expect(applySnapsAction(after, 'b', { type: 'snapsPlay', cardId: 'hearts-J' }).ok).toBe(true); // J beats 9 too
  });
  it('banks a marriage until the first trick and doubles it in trumps', () => {
    const s = fixed(['spades-K', 'spades-Q', 'clubs-K', 'clubs-Q'], ['hearts-9', 'hearts-J', 'diamonds-9', 'diamonds-J'], 'clubs-A', ['hearts-10', 'hearts-A', 'diamonds-10', 'diamonds-A']);
    const r = applySnapsAction(s, 'a', { type: 'snapsPlay', cardId: 'clubs-Q', marriage: true });
    if (!r.ok) throw Error(r.error);
    expect(r.state.players[0]!.pending).toBe(40);
    const t = applySnapsAction(r.state, 'b', { type: 'snapsPlay', cardId: 'hearts-9' });
    if (!t.ok) throw Error(t.error);
    expect(t.state.players[0]!.points).toBe(43); // Q of trumps 3 + 40
  });
  it('swaps the trump nine and lets the leader close the talon', () => {
    const s = fixed(['clubs-9', 'hearts-A'], ['hearts-9'], 'clubs-A', ['diamonds-9', 'diamonds-J', 'spades-9']);
    const r = applySnapsAction(s, 'a', { type: 'snapsExchange' });
    if (!r.ok) throw Error(r.error);
    expect(r.state.trumpCard!.id).toBe('clubs-9');
    expect(r.state.players[0]!.hand.map((c) => c.id)).toContain('clubs-A');
    const c = applySnapsAction(r.state, 'a', { type: 'snapsClose' });
    if (!c.ok) throw Error(c.error);
    expect(snapsViewFor(c.state, 'b').strict).toBe(true);
  });
  it('accepts its actions over the wire', () => {
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'snapsPlay', cardId: 'hearts-K', marriage: true } }).success).toBe(true);
    expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action: { type: 'snapsClose' } }).success).toBe(true);
  });
});
