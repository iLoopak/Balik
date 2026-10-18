import { describe, expect, it } from 'vitest';
import { applyDurakAction, createDeck32, createDurakRound, durakBeats, mulberry32, type DurakState } from '../src';
import { clientMessageSchema } from '../src/schema';
import { playthrough } from './helpers/playthrough';

const card = (id: string) => createDeck32().find((c) => c.id === id)!;
const secret = (s: unknown, viewer: string) => {
  const st = s as DurakState;
  return [...st.players.filter((p) => p.id !== viewer).flatMap((p) => p.hand), ...st.talon].map((c) => c.id).filter((id) => id !== st.trumpCard.id);
};
function fixed(a: string[], b: string[], trump = 'clubs-7', talon: string[] = []): DurakState {
  const s = createDurakRound(['a', 'b'], 0, mulberry32(1)).state;
  s.players[0]!.hand = a.map(card); s.players[1]!.hand = b.map(card);
  s.trumpCard = card(trump); s.trump = card(trump).suit; s.talon = [card(trump), ...talon.map(card)];
  s.limit = Math.min(6, b.length);
  return s;
}
const ok = (r: ReturnType<typeof applyDurakAction>) => { if (!r.ok) throw Error(r.error); return r.state; };

describe('Durak', () => {
  it('finishes bot games for 2–4 players with exactly one durak (or a draw), keeping hands private', () => {
    for (const n of [2, 3, 4]) for (let seed = 1; seed <= 25; seed++) {
      const ids = ['a', 'b', 'c', 'd'].slice(0, n);
      const { state, winners } = playthrough('durak', ids, seed, secret);
      const s = state as DurakState;
      if (s.result!.loserId) expect(winners).toHaveLength(n - 1); else expect(winners).toHaveLength(n);
    }
  });
  it('beats only with a higher card of the suit or a trump', () => {
    expect(durakBeats(card('hearts-9'), card('hearts-8'), 'clubs')).toBe(true);
    expect(durakBeats(card('hearts-7'), card('hearts-8'), 'clubs')).toBe(false);
    expect(durakBeats(card('clubs-7'), card('hearts-A'), 'clubs')).toBe(true);
    expect(durakBeats(card('spades-A'), card('hearts-8'), 'clubs')).toBe(false);
  });
  it('lets attackers add only ranks on the table, then beats off and swaps roles', () => {
    let s = fixed(['hearts-8', 'spades-8', 'diamonds-K'], ['hearts-9', 'spades-10', 'diamonds-7'], 'clubs-7', ['clubs-9', 'clubs-10']);
    s = ok(applyDurakAction(s, 'a', { type: 'durakAttack', cardId: 'hearts-8' }));
    s = ok(applyDurakAction(s, 'b', { type: 'durakDefend', cardId: 'hearts-9' }));
    expect(applyDurakAction(s, 'a', { type: 'durakAttack', cardId: 'diamonds-K' }).ok).toBe(false);
    s = ok(applyDurakAction(s, 'a', { type: 'durakAttack', cardId: 'spades-8' }));
    s = ok(applyDurakAction(s, 'b', { type: 'durakDefend', cardId: 'spades-10' }));
    s = ok(applyDurakAction(s, 'a', { type: 'durakPass' }));
    expect(s.discardCount).toBe(4);
    expect(s.players[s.attackerIndex]!.id).toBe('b');
    // Refill stops at six cards (here: what the talon has), attacker first.
    expect(s.players.map((p) => p.hand.length)).toEqual([4, 1]);
    // With a full talon everybody stops at exactly six.
    let t = fixed(['hearts-8', 'spades-J'], ['hearts-9', 'spades-10'], 'clubs-7', ['clubs-8', 'clubs-9', 'clubs-10', 'clubs-J', 'clubs-Q', 'clubs-K', 'clubs-A', 'diamonds-7', 'diamonds-8', 'diamonds-9', 'diamonds-10', 'diamonds-J']);
    t = ok(applyDurakAction(t, 'a', { type: 'durakAttack', cardId: 'hearts-8' }));
    t = ok(applyDurakAction(t, 'b', { type: 'durakDefend', cardId: 'hearts-9' }));
    t = ok(applyDurakAction(t, 'a', { type: 'durakPass' }));
    expect(t.players.map((p) => p.hand.length)).toEqual([6, 6]);
  });
  it('makes the defender take the whole table and skips their attack', () => {
    let s = fixed(['hearts-8', 'spades-9'], ['diamonds-7', 'diamonds-8'], 'clubs-7', ['clubs-9', 'clubs-10', 'clubs-J']);
    s = ok(applyDurakAction(s, 'a', { type: 'durakAttack', cardId: 'hearts-8' }));
    s = ok(applyDurakAction(s, 'b', { type: 'durakTake' }));
    expect(s.players[1]!.hand.map((c) => c.id)).toContain('hearts-8');
    expect(s.players[s.attackerIndex]!.id).toBe('a');
  });
  it('accepts its actions over the wire', () => {
    for (const action of [{ type: 'durakAttack', cardId: 'hearts-8' }, { type: 'durakDefend', cardId: 'hearts-9' }, { type: 'durakTake' }, { type: 'durakPass' }])
      expect(clientMessageSchema.safeParse({ t: 'act', baseSeq: 1, action }).success).toBe(true);
  });
});
